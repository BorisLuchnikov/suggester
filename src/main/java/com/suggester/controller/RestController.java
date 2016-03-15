package com.suggester.controller;

import com.google.common.collect.ImmutableList;
import com.google.gson.*;
import com.suggester.service.HttpService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.LinkedHashMap;

/**
 * @author bluchnikov
 * @since 27.02.2016
 */
@Controller
public class RestController {
    private final Logger logger = LoggerFactory.getLogger(RestController.class);
    private static final ImmutableList CITY_TYPE = ImmutableList.of("city", "settlement");

    @Value("${api2gis.search.url}")
    private String searchUrl;

    @Value("${api2gis.get.url}")
    private String getUrl;

    @Value("${api2gis.region.url}")
    private String regionUrl;

    @Autowired
    private HttpService httpService;

    @RequestMapping(value = "/getAddress", produces = "application/json;charset=UTF-8", method = RequestMethod.GET)
    @ResponseBody
    public String getAddressByPoint(@RequestParam("point") final String point,
                                    @RequestParam(value = "radius", required = false, defaultValue = "30") final int radius) {
        String result = gettingAddressByPoint(point, radius);
        if (result == null && 100 > radius && 220 < radius) {
            result = gettingAddressByPoint(point, 220);
        }
        return createResponse(result);
    }

    @RequestMapping(value = "/getAddressById", produces = "application/json;charset=UTF-8", method = RequestMethod.GET)
    @ResponseBody
    public String getAddressById(@RequestParam("id") final String id) {
        LinkedHashMap<String, String> parameters = new LinkedHashMap<>();
        parameters.put("id", id);
        parameters.put("fields", "items.geometry.selection,items.adm_div,items.address,items.floors,items.attraction,items.statistics,items.level_count,items.capacity,items.description,items.context,items.access_name,items.is_paid,items.access,items.access_comment,items.schedule");

        String result = null;
        try {
            result = httpService.getForStringResult(httpService.buildRequestUri(getUrl, parameters), 30000);
        } catch (IOException e) {
            logger.error(e.getLocalizedMessage());
        }
        return result;
    }

    @RequestMapping(value = "/getAddressByQuery", produces = "application/json;charset=UTF-8", method = RequestMethod.GET)
    @ResponseBody
    public String getAddressByQuery(@RequestParam("q") final String q,
                                    @RequestParam(value = "region_id", required = false) final Integer regionId) {
        String result = gettingAddressByQuery(q, regionId, "building,street,adm_div.city,adm_div.settlement");
        if (result != null && !result.contains("error")) {
            JsonParser parser = new JsonParser();
            JsonObject mainObject = parser.parse(result).getAsJsonObject();
            JsonArray items = mainObject.getAsJsonObject("result").getAsJsonArray("items");

            int countStreet = 0;
            for (JsonElement address : items) {
                JsonObject addressObject = address.getAsJsonObject();
                if ("street".equals(addressObject.getAsJsonPrimitive("type").getAsString())) {
                    countStreet++;
                }
            }
            if (countStreet == 1) {
                JsonElement address = items.get(0);
                JsonObject addressObject = address.getAsJsonObject();
                if ("street".equals(addressObject.getAsJsonPrimitive("type").getAsString())) {
                    String selection = addressObject.getAsJsonObject("geometry").getAsJsonPrimitive("selection").getAsString();
                    selection = selection.replaceAll("MULTILINESTRING", "");
                    selection = selection.replaceAll("LINESTRING", "");
                    selection = selection.replaceAll("\\)", "");
                    selection = selection.replaceAll("\\(", "");
                    String[] selectionArray = selection.split(",");
                    int index = selectionArray.length % 2;
                    String point = selectionArray[index].replaceAll(" ", ",");
                    result = gettingAddressByPoint(point, 100, 20);
                    return createResponseWithStreetFilter(result, addressObject.getAsJsonPrimitive("name").getAsString(), addressObject);
                }
            } else {
                createResponse(result);
            }
        } else {
            return null;
        }
        return createResponse(result);
    }

    @RequestMapping(value = "/getRegions", produces = "application/json;charset=UTF-8", method = RequestMethod.GET)
    @ResponseBody
    public String getRegions() {
        LinkedHashMap<String, String> parameters = new LinkedHashMap<>();
        parameters.put("locale_filter", "ru_RU");

        String result = null;
        try {
            result = httpService.getForStringResult(httpService.buildRequestUri(regionUrl, parameters), 30000);
        } catch (IOException e) {
            logger.error(e.getLocalizedMessage());
        }
        if (result != null && !result.contains("error")) {
            JsonParser parser = new JsonParser();
            JsonObject mainObject = parser.parse(result).getAsJsonObject();
            JsonArray items = mainObject.getAsJsonObject("result").getAsJsonArray("items");
            return items.toString();
        } else {
            return null;
        }
    }

    private String gettingAddressByQuery(String q, Integer regionId, String type) {
        String result = null;
        if (q.length() > 2) {
            LinkedHashMap<String, String> parameters = new LinkedHashMap<>();
            parameters.put("q", q);
            if (regionId != null) {
                parameters.put("region_id", regionId.toString());
            }
            parameters.put("type", type);
            parameters.put("page_size", "5");
            parameters.put("fields", "items.adm_div,items.address,items.geometry.selection");
            try {
                result = httpService.getForStringResult(httpService.buildRequestUri(searchUrl, parameters), 30000);
            } catch (IOException e) {
                logger.error(e.getLocalizedMessage());
            }
        }
        return result;
    }

    private String gettingAddressByPoint(String point, int radius) {
        return gettingAddressByPoint(point, radius, 5);
    }

    private String gettingAddressByPoint(String point, int radius, int pageSize) {
        LinkedHashMap<String, String> parameters = new LinkedHashMap<>();
        parameters.put("point", point);
        parameters.put("radius", String.valueOf(radius));
        parameters.put("type", "building");
        parameters.put("page_size", String.valueOf(pageSize));
        parameters.put("fields", "items.adm_div,items.address");

        String result = null;
        try {
            result = httpService.getForStringResult(httpService.buildRequestUri(searchUrl, parameters), 30000);
        } catch (IOException e) {
            logger.error(e.getLocalizedMessage());
        }
        return result;
    }

    private String createResponse(String result) {
        if (result != null && !result.contains("error")) {
            JsonArray resultJsonArray = new JsonArray();
            JsonParser parser = new JsonParser();
            JsonObject mainObject = parser.parse(result).getAsJsonObject();
            JsonArray items = mainObject.getAsJsonObject("result").getAsJsonArray("items");
            for (JsonElement address : items) {
                JsonObject jsonObject = new JsonObject();
                JsonObject addressObject = address.getAsJsonObject();
                jsonObject.add("id", addressObject.get("id"));
                jsonObject.add("address_name", addressObject.get("address_name"));
                jsonObject.add("name", addressObject.get("name"));
                JsonArray admDiv = addressObject.getAsJsonArray("adm_div");
                for (JsonElement div : admDiv) {
                    JsonObject divObject = div.getAsJsonObject();
                    if (CITY_TYPE.contains(divObject.get("type").getAsString())) {
                        jsonObject.add("city", divObject.get("name"));
                    }
                }
                resultJsonArray.add(jsonObject);
            }
            return resultJsonArray.toString();
        } else {
            return null;
        }
    }

    private String createResponseWithStreetFilter(String result, String street, JsonObject firstItem) {
        if (result != null && !result.contains("error")) {
            JsonArray resultJsonArray = new JsonArray();

            JsonObject fI = new JsonObject();
            fI.add("id", firstItem.get("id"));
            fI.add("address_name", firstItem.get("address_name"));
            fI.add("name", firstItem.get("name"));
            JsonArray aD = firstItem.getAsJsonArray("adm_div");
            for (JsonElement div : aD) {
                JsonObject divObject = div.getAsJsonObject();
                if (CITY_TYPE.contains(divObject.get("type").getAsString())) {
                    fI.add("city", divObject.get("name"));
                }
            }
            resultJsonArray.add(fI);

            JsonParser parser = new JsonParser();
            JsonObject mainObject = parser.parse(result).getAsJsonObject();
            JsonArray items = mainObject.getAsJsonObject("result").getAsJsonArray("items");
            for (JsonElement address : items) {
                JsonObject jsonObject = new JsonObject();
                JsonObject addressObject = address.getAsJsonObject();
                if (addressObject.get("address_name") != null && addressObject.get("address_name").getAsString().contains(street)) {
                    jsonObject.add("id", addressObject.get("id"));
                    jsonObject.add("address_name", addressObject.get("address_name"));
                    jsonObject.add("name", addressObject.get("name"));
                    JsonArray admDiv = addressObject.getAsJsonArray("adm_div");
                    for (JsonElement div : admDiv) {
                        JsonObject divObject = div.getAsJsonObject();
                        if (CITY_TYPE.contains(divObject.get("type").getAsString())) {
                            jsonObject.add("city", divObject.get("name"));
                        }
                    }
                    resultJsonArray.add(jsonObject);
                    if (resultJsonArray.size() == 5) {
                        break;
                    }
                }
            }
            if (resultJsonArray.size() != 0) {
                return resultJsonArray.toString();
            } else {
                return null;
            }
        } else {
            return null;
        }
    }
}