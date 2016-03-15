var iSuggester = {
    
    /* http://api.sypexgeo.net/cJlaH/json - api для получения города по ip адресу */
    "serverUrl" : "", /* Сервер, возвращающий саггесты */
    "geolocationData" : null, /* Сюда мы запишем данные геолокации */
    "city" : null, /* Город. Первый раз определяем исходя их IP адреса */
    "searchBox" : null, /* объект с полем для поиска адреса */
    "suggestionsBox" : null, /* запоминаем див для саггестов */
    "suggestions" : null, /* список саггестов */
    "activeSuggestion" : null, /* для визуального выделения выбранных саггестов (для стрелок) */
    "activeSearch" : null, /* флаг который сокращает спам к апишке (если человек печатет быстро, мы не сразу кидаем геты) */
    "parsedAddress" : null, /* массив с айдишниками полей в которые нужно разобрать адрес */
    "mapPlaceholder" : null, /* пхолдер для карты */
    "firstClick" : false,

    "init" : function(params) { /* Функция инициализирующая саггестор */

        var searchBox = params.searchBox;
        var parsedAddress = params.parsedAddress;
        var mapPlaceholder = params.mapPlaceholder;

        if (searchBox == null || searchBox == undefined || searchBox == "") { /* проверяем, указали ли поле поиска */
            alert ("Не указан ID поля для ввода адреса");
            return false;
        } else {
            this.searchBox = document.getElementById(searchBox);
        }

        if (parsedAddress != null && parsedAddress != undefined) { /* инициализируем разобранный адрес */
            iSuggester.parsedAddress = parsedAddress;
        }

        if (mapPlaceholder != null && mapPlaceholder != undefined) { /* инициализируем карту */
            iSuggester.mapPlaceholder = mapPlaceholder;
        }

        this.getCityWithIp(); /* получаем город по IP адресу */
        this.getGeolocationData(); /* получаем геолокацию */
        this.buildSuggestionsPlaceholder(); /* собираем плейсхолдер для саггестов */
        window.addEventListener("click", function() { /* скрываем список саггестов при клике в куда-нибудь */
            iSuggester.suggestionsBox.style.display = "none";
        });
        this.searchBox.addEventListener("click", function(e) { /* рендерим имеющиеся саггесты */
            iSuggester.renderSuggestions();
            e.stopPropagation();
        });
        this.searchBox.setAttribute("onkeydown", "iSuggester.selectSuggestion(event);"); /* затычка для FF (выбираем саггесты стрелками) */
        this.searchBox.setAttribute("onkeyup", "iSuggester.addressType(event);"); /* ручной ввод адреса */

    },

    "getGeolocationData" : function() { /* получаем геолокацию */
        if (navigator.geolocation) { /* проверяем, умеет ли браузер брать геолоку */
            navigator.geolocation.getCurrentPosition(this.setGeolocationData, this.showGeolocationDataErrors);
        } else { /* не умеет брать геолоку :( */
            alert ("Ваш браузер не поддерживает передачу геопозиции :( ");
        }
    },

    "setGeolocationData" : function(position) {

        var coordinates = position.coords;

        iSuggester.geolocationData = {};
        iSuggester.geolocationData.point = coordinates.longitude + "," + coordinates.latitude /* долгота + широта */;
        iSuggester.geolocationData.radius = coordinates.accuracy; /* погрешность */

        if (iSuggester.mapPlaceholder != null) {
            iSuggester.initMap(iSuggester.geolocationData.point);
        }

        iSuggester.getSuggestions("getAddress"); /* получаем саггесты */

    },

    "getSuggestions" : function(requestType, params, callback) { /* получаем саггесты */

        /*
         requestType == getAddress - получение данных по геолокации ( /suggester2gis/getAddress?point=82.8975332,54.979858&radius=30 )
         requestType == getAddressById - получение данных по id ( /suggester2gis/getAddressById?id=141373143572328 )
         requestType == getAddressByQuery - получение данных по произвольной строке ( /suggester2gis/getAddressByQuery?q=Novosibirsk)
         */

        if (!params) {
            params = iSuggester.geolocationData;
        }

        var url = iSuggester.serverUrl + "/suggester/" + requestType + "?";

        for (param in params) {
            url += param + "=" + params[param] + "&"; /* TODO для последнего элемента не добавлять символ & */
        }

        var ajax = new XMLHttpRequest();
        ajax.open("GET", url);
        ajax.send();

        ajax.onload = function() {
            var suggestions = ajax.responseText;
            if (suggestions.length == 0) { /* чекаем, чтобы ответ был не пустой */
                iSuggester.suggestionsBox.innerHTML = ""; /* сбрасываем список саггестов при сценарии когда список пустой */
                return false;
            }
            if (typeof(suggestions) == "string") {
                suggestions = JSON.parse(suggestions);
            }
            iSuggester.suggestions = suggestions;
            if (callback != null && callback != undefined) {
                callback(); /* лапшекод */
            }
        }
    },

    "showGeolocationDataErrors" : function(error) { /* отображаемм почему не удалось получить геолокацию */

        return false; /* TODO если будем юзать - разрешим */
        switch(error.code) {
            case error.PERMISSION_DENIED:
                alert("Вы отклонили запрос геолокации :( (а жаль, все это могло произойти быстрее)");
                break;
            case error.POSITION_UNAVAILABLE:
                alert("Информация о положении недоступна :(");
                break;
            case error.TIMEOUT:
                alert("Время получения геопозиции истекло :(");
                break;
            case error.UNKNOWN_ERROR:
                alert("При получении геолокации произошла неизвестная ошибка :(");
                break;
        }
    },

    "buildSuggestionsPlaceholder" : function() { /* собираем плейсхолдер для саггестов */
        var searchBoxPosition = this.searchBox.getBoundingClientRect();
        this.suggestionsBox = document.createElement("div");
        this.suggestionsBox.id = new Date().getTime();
        this.suggestionsBox.style.width = this.searchBox.offsetWidth + "px";
        this.suggestionsBox.style.position = "absolute";
        this.suggestionsBox.style.left = searchBoxPosition.left + "px";
        this.suggestionsBox.style.top = searchBoxPosition.top + this.searchBox.offsetHeight + 7 + "px";
        this.suggestionsBox.style.zIndex = "999";
        this.suggestionsBox.style.fontFamily = "Arial";
        this.suggestionsBox.style.fontSize = "14px";
        this.searchBox.parentNode.insertBefore(this.suggestionsBox, this.searchBox.nextSibling);
    },

    "renderSuggestions" : function() { /* отрисовываем саггесты */

        if (iSuggester.searchBox.value == "" && !iSuggester.firstClick) {
            iSuggester.searchBox.value = iSuggester.city + " "; /* выводим название города в инпут */
            iSuggester.firstClick = true;
        }

        if (iSuggester.suggestions == null ||  iSuggester.suggestionsBox == null) { /* мы не будем выводить див, если нет доступных саггестов */
            return false;
        }

        iSuggester.suggestionsBox.innerHTML = "<div style='background-color: #FAFAFA; color: #808080; padding: 5px 25px; font-size: 12px;'>Выберите вариант или продолжите ввод</div>"; /* сбрасываем список саггестов */
        iSuggester.suggestionsBox.style.display = ""; /* делаем список саггестов видимым */

        iSuggester.suggestions.forEach(function(suggest) {
            var suggestion = document.createElement("div");
            suggestion.id = suggest.id;
            suggestion.innerHTML = (!suggest.city ? "" : suggest.city + ", ") + (!suggest.address_name ? suggest.name : suggest.address_name + (suggest.address_name == suggest.name ? "" : " (" + suggest.name + ")")); /* Текстовка саггеста */
            suggestion.setAttribute("style", "background-color: #FAFAFA; cursor: pointer; padding: 10px;");

            suggestion.addEventListener("mouseover", function() { /* ивент при наведении мыши */
                suggestion.style.backgroundColor = "#EDEDED";
            });
            suggestion.addEventListener("mouseout", function() { /* ивент убираем курсор мыши */
                suggestion.style.backgroundColor = "#FAFAFA";
            });
            suggestion.addEventListener("click", function() {
                iSuggester.setSuggestion(suggestion);
                iSuggester.searchBox.focus(); /* фокусим поле ввода адреса после выбора саггеста */
            });

            iSuggester.suggestionsBox.appendChild(suggestion);
        });
    },

    "setSuggestion" : function(suggestion) { /* когда выбираем какой-либо саггест */
        iSuggester.searchBox.value = suggestion.textContent + " ";
        iSuggester.suggestionsBox.style.display = "none";
        iSuggester.activeSuggestion = null; /* затычка для выбора стрелочками */

        if (iSuggester.parsedAddress != null) {
            iSuggester.injectAddress(suggestion.id);
        }
    },

    "selectSuggestion" : function(e) { /* двигаем стрелочки */

        if (iSuggester.suggestionsBox.offsetHeight == 0) { /* не даем выбирать из скрытого списка саггестов */
            return false;
        }

        e = e || window.event;

        if (iSuggester.activeSuggestion != null) {
            iSuggester.activeSuggestion.style.backgroundColor = "#FFFFFF"; /* сбрасываем цвет */
        }

        if (e.keyCode == "38") { /* up arrow */
            if (iSuggester.activeSuggestion == null) { /* если не выбрано саггестов */
                iSuggester.activeSuggestion = iSuggester.suggestionsBox.lastChild; /* берем последний элемент в списке */
            } else {
                iSuggester.activeSuggestion = iSuggester.activeSuggestion.previousSibling; /* предыдущий элемент в списке */
            }
        }
        else if (e.keyCode == "40") { /* down arrow */
            if (iSuggester.activeSuggestion == null) { /* если не выбрано саггестов */
                iSuggester.activeSuggestion = iSuggester.suggestionsBox.firstChild.nextSibling; /* берем первый элемент в списке */
            } else {
                iSuggester.activeSuggestion = iSuggester.activeSuggestion.nextSibling; /* следующий элемент в списке */
            }
        }
        else if (e.keyCode == "13") {
            iSuggester.setSuggestion(iSuggester.activeSuggestion);
        }
        else {
            return false; /* его слегка ебашит когда тыкаешь <- или -> если не заретурнить */
        }

        if (iSuggester.activeSuggestion.id != "") { /* реально задрали стрелки.. :( кастыль по избежание ховер первой строки */
            iSuggester.activeSuggestion.style.backgroundColor = "#EDEDED";
            iSuggester.searchBox.value = iSuggester.activeSuggestion.textContent + " ";
        }
    },

    "getCityWithIp" : function() { /* получаем город по IP адресу */

        var ajax = new XMLHttpRequest();
        ajax.open("GET", "http://api.sypexgeo.net/ypUOZ/json", false); /* http://ip-api.com/json только тут выдает не русское название города D: /81.28.215.86 - ip бердска */
        ajax.send();
        var city = ajax.responseText;
        if (typeof(city) == "string") {
            city = JSON.parse(city);
        }
        iSuggester.city = city.city.name_ru;
        if (iSuggester.city == null || iSuggester.city == undefined) { /* todo а чё делать, если не удалось получить город по ip? */
            iSuggester.city = "Новосибирск";
        }
    },

    "addressType" : function(e) { /* вводим адресок ручками */

        e = e || window.event;

        var ignoredKeys = [37, 38, 39, 40, 16, 18, 13, 35, 36];

        if (ignoredKeys.indexOf(e.keyCode) != -1) { /* игнорируем тапы в стрелки, шифт, контрол, альт, enter, home, end */
            return false;
        }

        var query = {
            "q" : iSuggester.searchBox.value,
        };

        if (query.q.length >= 2) { /* ищем от двух символов и больше */

            if (iSuggester.activeSearch != null) {
                clearTimeout(iSuggester.activeSearch);
            }

            iSuggester.activeSearch = setTimeout(function() { /* немного ждем прежде чем кинуть запрос */
                iSuggester.getSuggestions("getAddressByQuery", query, iSuggester.renderSuggestions);
            }, 100);
        } else { /* если в поел для поиска < 2 символов, то мы скрываем список саггестов и чистим их */
            iSuggester.suggestions = null;
            iSuggester.suggestionsBox.style.display = "none";
        }
    },

    "initMap" : function(geolocation) {
        DG.then(function () {
            map = DG.map(iSuggester.mapPlaceholder, {
                center: [54.9800639, 82.89749619999999],
                zoom: 17
            });

            map.on('click', function(e) {
                console.log(e);
            });

            DG.marker([54.9800639, 82.89749619999999]).addTo(map).bindPopup('Вы здесь?');
        });
    },

    "injectAddress" : function(objectId) {

        if (objectId == null || objectId == undefined) {
            return false;
        }

        var ajax = new XMLHttpRequest();
        ajax.open("GET", iSuggester.serverUrl + "/suggester/getAddressById?id=" + objectId);
        ajax.send();

        ajax.onload = function() {
            var objectData = ajax.responseText;

            if (typeof(objectData) == "string") {
                objectData = JSON.parse(objectData);
            }

            objectData = objectData.result.items[0];

            var fields = iSuggester.parsedAddress;
            var admDiv = objectData.adm_div;
            var city, district;

            admDiv.forEach(function(item) {
                if (item.type == "city") {
                    city = item.name;
                }
                else if (item.type == "district") {
                    district = item.name;
                }
            });

            var addressComponents = objectData.address ? objectData.address.components[0] : null,
                street = addressComponents ? addressComponents.street : "-",
                postcode = addressComponents ? addressComponents.postcode : "-",
                number = addressComponents ? addressComponents.number : "-",
                floors = objectData.floors ? objectData.floors.ground_count : "-",
                geometry = objectData.geometry && objectData.geometry.selection ? objectData.geometry.selection.replace("POINT(", "").replace(")", "") : "-";
            city = city ? city : "";
            var address_name = objectData.address_name ? objectData.address_name : "";



            document.getElementById(fields.name).innerHTML = objectData.name;
            document.getElementById(fields.address).innerHTML = city + ", " + address_name;
            document.getElementById(fields.postcode).innerHTML = postcode;
            document.getElementById(fields.city).innerHTML = city;
            document.getElementById(fields.district).innerHTML = !district ? "-" : district;
            document.getElementById(fields.street).innerHTML = street;
            document.getElementById(fields.number).innerHTML = number;
            document.getElementById(fields.floors).innerHTML = floors;
            document.getElementById(fields.geometry).innerHTML = geometry;

            /*
             name - наименование
             address - адрес из саггеста (собираем по кускам)
             postcode - индекс
             city - город
             district - район города
             street - улица
             number - номер дома
             floors - количество этажей
             geometry - Геокоординаты
             */
        }
    }
}
