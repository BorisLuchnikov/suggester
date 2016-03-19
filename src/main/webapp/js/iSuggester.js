var iSuggester = {

    serverUrl : "/suggester", /* Сервер, возвращающий саггесты */
    searchBox : null, /* html объект строки поиска */
    suggestions : [], /* Список саггестов */
    activeSuggestion : null, /* Выбранный саггест */
    activeSearch : null, /* Эта вещь поможет нам абортить лишние запросы к серверу */
    userGeolocationData : null, /* Геолокационные данные пользователя */
    userCity : null, /* Город пользователя */
    addressFields : null, /* Список айдишников полей, в которые нужно разобрать адрес*/
    suggestionsBox : {  /* div для саггестов */
        placeholder : null, /* Главный div */
        hint : null, /* div с хинтом */
        selectable : null /* выбираемые div'ы с саггестами */
    },

    init : function(params) { /* Функция инициализирующая саггестор */

        this.searchBox = document.getElementById(params.searchBox); /* Запоминаем строку для ввода адреса */
        this.addressFields = params.addressFields; /* Запоминаем id филдов для разобранного адреса */

        if (this.searchBox == null || this.searchBox == undefined) { /* Проверяем, что у нас правильно инициализировано поле поиска */
            return false;
        }

        this.buildSuggestionsPlaceholder();
        this.getUserCityByIP(); /* получаем город пользователя по IP адресу */
        this.getUserGeolocationData(); /* получаем геолокацию пользователя */
        this.searchBox.onclick = function(e) { iSuggester.handleClickOnSearchBox(e); } /* Обработка кливов мыши в поле поиска */
        this.searchBox.onkeyup = function (e) { iSuggester.handleKeyPress(e); }  /* Обрабатываем нажания кнопок, когда строка поиска в фокусе */
        window.onclick = function () { iSuggester.hideSuggestionsPlaceholder(); } /* Скрываем плейсхолдер с саггестами при клике куда-либо */
    },

    getUserGeolocationData : function() { /* Функция получения геопозиции пользователя */
        if (navigator.geolocation) { /* Проверяем, умеет ли браузер получать геопозицию. Не умеет IE 8 и ниже. */
            window.navigator.geolocation.getCurrentPosition(this.setUserGeolocationData);
        } else { /* Не умеет получать геопозицию :( */
            console.log("Браузер не поддерживает передачу геопозиции :(");
        }
    },

    setUserGeolocationData : function(position) { /* Функция сохранения геопозиции пользователя */
        var coordinates = position.coords;
        var userGeolocationData = {};
        userGeolocationData.latitude = coordinates.latitude; /* Широта */
        userGeolocationData.longitude = coordinates.longitude; /* Долгота */
        userGeolocationData.accuracy = (coordinates.accuracy > 250 ? 250 : coordinates.accuracy); /* Точность */
        iSuggester.userGeolocationData = userGeolocationData;
        iSuggester.getSuggestions("/getAddress?point=" + userGeolocationData.longitude + "," + userGeolocationData.latitude + "&radius=" + userGeolocationData.accuracy);
    },

    getUserCityByIP : function() { /* Функция получения города пользователя по его IP адресу */
        this.sendAjax("http://api.sypexgeo.net/ypUOZ/json", this.setUserCity); /* TODO Решить откуда берем город */
    },

    setUserCity : function(ipData) { /* Функция сохранения города пользователя (полученного по IP) */
        iSuggester.userCity = ipData.city.name_ru;
    },

    buildSuggestionsPlaceholder : function() { /* Создаем плейсхолдер для саггестов */

        var placeholderAttrs = { /* Атрибуты основного дива */
            id : "placeholder" + new Date().getTime(),
            style : "width: " + this.searchBox.offsetWidth + "px; font-size: 14px; font-family: Arial; position: absolute; display: none; z-index: 999;"
        }
        var hintAttrs = { /* Атрибуты для div'a с хинтами */
            id : "hint" + new Date().getTime(),
            style : "background-color: #FAFAFA; color: #808080; padding: 5px 25px; font-size: 12px;"
        }
        var selectableAttrs = { /* Атрибуты для div'a с саггестами */
            id : "selectable" + new Date().getTime()
        }
        var placeholder = this.createDiv(placeholderAttrs); /* Основной див */
        var hint = this.createDiv(hintAttrs); /* div с хинтом */
        var selectable = this.createDiv(selectableAttrs); /* выбираемые div'ы с саггестами */

        placeholder.appendChild(hint);
        placeholder.appendChild(selectable);

        this.searchBox.parentNode.insertBefore(placeholder, this.searchBox.nextSibling);
        this.suggestionsBox.placeholder = placeholder;
        this.suggestionsBox.hint = hint;
        this.suggestionsBox.selectable = selectable;
    },

    stylingSuggestionsPlaceholder : function() { /* Добавляем стили плейсхолдеру для саггестов. Необходимо при изменении его положения */
        var searchBoxPosition = this.searchBox.getBoundingClientRect(); /* Положения поля поиска */
        var placeholderStyle = this.suggestionsBox.placeholder.style;
        placeholderStyle.left = searchBoxPosition.left + "px";
        placeholderStyle.top = searchBoxPosition.top + this.searchBox.offsetHeight + window.pageYOffset + 7 + "px";
        placeholderStyle.display = ""; /* делаем список саггестов видимым */
    },

    stylingActiveSuggestion : function () { /* Подсвечиваем саггест, выбранный стрелками */
        this.activeSuggestion.style.backgroundColor = "#EDEDED";
    },

    hideSuggestionsPlaceholder : function() { /* Скрываем плейсхолдер для саггестов */
        this.suggestionsBox.placeholder.style.display = "none";
    },

    getSuggestions : function(query) { /* Получаем саггесты */
        this.sendAjax(this.serverUrl + query, this.setSuggestions);
    },

    setSuggestions : function(suggestions) { /* Сохраняем саггесты */
        iSuggester.suggestions = suggestions;
        iSuggester.renderSuggestions(); /* Отрисовываем саггесты */
    },

    renderSuggestions : function() { /* Отрисовываем саггесты */
        var selectable = iSuggester.suggestionsBox.selectable;
        selectable.innerHTML = ""; /* Рефрешим плейсхолдер для саггестов */
        this.suggestions.forEach(function(suggest) { /* Перебираем саггесты */
            var suggestionAttrs = {
                id : suggest.id,
                style : "background-color: #FAFAFA; cursor: pointer; padding: 10px;"
            }
            var suggestion = iSuggester.createDiv(suggestionAttrs); /* Создаем div с саггестом */
            suggestion.innerHTML = (!suggest.city ? "" : suggest.city + ", ") + (!suggest.address_name ? suggest.name : suggest.address_name + (suggest.address_name == suggest.name ? "" : " (" + suggest.name + ")")); /* Текстовка саггеста */
            suggestion.onmouseover = function () { suggestion.style.backgroundColor = "#EDEDED"; } /* Изменяем цвет при наведении курсора */
            suggestion.onmouseout = function () { suggestion.style.backgroundColor = "#FAFAFA"; }
            suggestion.onclick = function () { iSuggester.setActiveSuggestion(suggestion, true); } /* Подставляем текст саггеста в строку поиска */
            selectable.appendChild(suggestion);
        });
        this.addHintSuggest();
    },

    addHintSuggest : function() { /* Добавляет саггест-хинт ("Выберите вариант или продолжите ввод") */
        var hint = this.suggestionsBox.hint;
        var currentAddress = this.searchBox.value; /* Текст, указанный в строке поиска */
        var haveSuggestions = (this.suggestions.length > 0 ? true : false); /* Есть саггесты? */

        if (!currentAddress && !haveSuggestions) { /* Строка поиска пуста и нет доступных сагггестов */
            hint.innerHTML = "Введите адрес в свободной форме";
        }
        else if (!currentAddress && haveSuggestions) { /* Строка поиска пуста и есть доступные сагггесты */
            hint.innerHTML = "Выберите вариант или введите адрес в свободной форме";
        }
        else if (currentAddress && !haveSuggestions) { /* Строка поиска не пуста и нет доступных сагггестов */
            hint.innerHTML = "Продолжите ввод";
        }
        else { /* Строка поиска не пуста и есть доступные сагггесты */
            hint.innerHTML = "Выберите вариант или продолжите ввод";
        }
    },

    createDiv : function(attributes) { /* Функция для создания div'a */
        var div = document.createElement("div");
        for (attribute in attributes) {
            div.setAttribute(attribute, attributes[attribute]);
        }
        return div;
    },

    setActiveSuggestion : function(suggestion, injectAddress) { /* Функция, срабатывающая при выборе саггеста / клике в него */
        if (!suggestion) { /* Проверка для сценария нажимания стрелок */
            suggestion = this.activeSuggestion;
        }
        this.searchBox.value = suggestion.textContent + " "; /* Подставляем текст саггеста в строку поиска */
        this.searchBox.focus(); /* Ставим курсор в конец строки поиска */
        if (injectAddress && this.addressFields) { /* Разбираем адрес по филдам */
            this.sendAjax(this.serverUrl + "/getAddressById?id=" + suggestion.id, this.injectAddress)
        }
    },

    handleClickOnSearchBox : function(e) { /* Функция, срабатывающая при клике мышью в строку поиска */
        e.stopPropagation(); /* Перехватываем скрытие плейсхолдера */
        if (!this.searchBox.value) { /* Если строка поиска пустая - хотя бы воткнем туда город */
            this.searchBox.value = this.userCity + ", ";
        }
        this.addHintSuggest(); /* Добавляем саггест - хинт */
        this.stylingSuggestionsPlaceholder(); /* Обновляем положения плейсхолдера с саггестами */
    },

    handleKeyPress : function(e) { /* Обрабатываем нажания кнопок, когда строка поиска в фокусе */

        e = e || window.event;
        var keyCode = e.keyCode;
        var ignoredKeys = [9, 20, 16, 17, 18, 37, 39, 36, 35, 34, 33, 27];

        if (ignoredKeys.indexOf(keyCode) != -1) { /* Игнорируем нажатие в стрелки, шифт, контрол, альт, enter, home, end  и тд*/
            return false;
        }
        else if(keyCode == 38) { /* Нажатие стреки "Вверх" */
            this.handleUpArrowKeyPress();
        }
        else if(keyCode == 40) { /* Нажатие стреки "Вниз" */
            this.handleDownArrowKeyPress();
        }
        else if(keyCode == 13) { /* Нажатие клавиши "Enter" */
            this.handleEnterKeyPress();
        }
        else { /* Вводим буквы/цифры/backspace/delete */
            this.handleAddressTyping();
        }
    },

    handleUpArrowKeyPress: function() { /* Обрабатываем нажания стрелки "Вверх" */
        if (!this.activeSuggestion) { /* Нет выбранного саггеста */
            this.activeSuggestion = this.suggestionsBox.selectable.lastChild; /* Берем последний элемент в списке */
        } else {
            this.activeSuggestion.style.backgroundColor = "#FAFAFA"; /* Возвращаем дефолтный цвет саггеста */
            this.activeSuggestion = this.activeSuggestion.previousSibling;
        }
        if (!this.activeSuggestion) { /* Проверяем достижение конца списка */
            this.activeSuggestion = this.suggestionsBox.selectable.lastChild; /* Берем последний элемент в списке */
        }
        this.stylingActiveSuggestion(); /* Подсвечиваем саггест, выбранный стрелками */
        this.setActiveSuggestion();
    },

    handleDownArrowKeyPress: function() { /* Обрабатываем нажания стрелки "Вниз" */
        if (!this.activeSuggestion) { /* Нет выбранного саггеста */
            this.activeSuggestion = this.suggestionsBox.selectable.firstChild; /* Берем первый элемент в списке */
        } else {
            this.activeSuggestion.style.backgroundColor = "#FAFAFA"; /* Возвращаем дефолтный цвет саггеста */
            this.activeSuggestion = this.activeSuggestion.nextSibling;
        }
        if (!this.activeSuggestion) { /* Проверяем достижение конца списка */
            this.activeSuggestion = this.suggestionsBox.selectable.firstChild; /* Берем первый элемент в списке */
        }
        this.stylingActiveSuggestion(); /* Подсвечиваем саггест, выбранный стрелками */
        this.setActiveSuggestion();
    },

    handleEnterKeyPress: function() { /* Обрабатываем нажания кнопки "Enter" */
        this.hideSuggestionsPlaceholder();
        this.setActiveSuggestion(null, true);
    },

    handleAddressTyping : function() { /* Обрабатываем ввод адреса */

        if (this.suggestionsBox.placeholder.style.display == "none") { /* Делаем список саггестов видим при наборе адреса */
            this.stylingSuggestionsPlaceholder(); /* Обновляем положения плейсхолдера с саггестами */
        }
        var query = this.searchBox.value;

        if (query.length >= 2) { /* Запускаем поиск при вводе от двух символов */
            if (this.activeSearch != null) {
                clearTimeout(this.activeSearch);
            }
            this.activeSearch = setTimeout(function() { /* немного ждем прежде чем кинуть запрос */
                iSuggester.getSuggestions("/getAddressByQuery?q=" + encodeURI(query));
            }, 200);
        }
    },

    injectAddress : function(addressData) { /* Разбираем адрес по кусочкам */
        var objectData = addressData.result.items[0]; /* Детали адреса */
        var fields = iSuggester.addressFields;
        var field = function (id) { return document.getElementById(id); };
        var name, fullAddress, postcode, city, district, street, number, floors, components;

        for (key in fields) { /* Сбрасываем предыдущие значения */
            var f = field(fields[key]);
            if (f) { f.value = "" }
        }

        var admDiv = objectData.adm_div; /* Город, Район города.*/
        var address = objectData.address; /* Индекс, Улица, Номер дома */
        var floorsCount = objectData.floors; /* Этажи, ... */

        name = objectData.name; /* Наименование */

        if (admDiv) { /* Город, Район города.*/
            admDiv.forEach(function(item) {
                if (item.type == "city") { city = item.name; }
                else if (item.type == "district") { district = item.name; }
            });
        }
        if (address) { /* Индекс, Улица, Номер дома */
            components = address.components; /* Улица, Номер дома */
            postcode = address.postcode; /* Индекс */
        }
        if (components) { /* Улица, Номер дома */
            components.forEach(function(item) {
                if (item.type == "street_number") {
                    street = item.street; /* Улица */
                    number = item.number; /* Номер дома */
                    fullAddress = (city ? city : "") + (street ? ", " + street : "") + (number ? ", " + number : "");
                }
            });
        }
        if (floorsCount) {
            floors = floorsCount.ground_count; /* Количество этажей */
        }

        var nameF = field(fields.name),
            fullAddressF = field(fields.address),
            postcodeF = field(fields.postcode),
            cityF = field(fields.city),
            districtF = field(fields.district),
            streetF = field(fields.street),
            numberF = field(fields.number),
            floorsF = field(fields.floors);

        /* if (__ && __F) { tags.indexOf(__F.tagName) != -1 ? __F.value = __ : __F.innerHTML = __; } */

        if (name && nameF) { nameF.value = name; }
        if (fullAddress && fullAddressF) { fullAddressF.value = fullAddress; }
        if (postcode && postcodeF) { postcodeF.value = postcode; }
        if (city && cityF) { cityF.value = city; }
        if (district && districtF) { districtF.value = district; }
        if (street && streetF) { streetF.value = street; }
        if (number && numberF) { numberF.value = number; }
        if (floors && floorsF) { floorsF.value = floors; }
    },

    sendAjax : function(url, callBack) { /* Асинхронный xhr запрос */
        var ajax = new XMLHttpRequest();
        ajax.open("GET", url);
        ajax.send();

        ajax.onload = function() {
            var response = ajax.responseText;

            if (response.length == 0) {
                response = []; /* Для сценария, когда нет доступных саггестов */
            }

            if (typeof(response) == "string") { /* Проверяем контент-тайп ответа */
                response = JSON.parse(response);
            }

            if (callBack != null && callBack != undefined) {
                callBack(response); /* Обрабатываем ответ */
            }
        }
    }
}