package com.suggester.service;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.utils.URIBuilder;
import org.apache.http.impl.client.HttpClientBuilder;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.LinkedHashMap;

import org.slf4j.Logger;


/**
 * @author bluchnikov
 * @since 26.02.2016
 */
@Service
public class HttpService {
    private final Logger logger = LoggerFactory.getLogger(HttpService.class);
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.132 Safari/537.36";

    @Value("${api2gis.key}")
    private String key;

    public String getForStringResult(URI url, int apiClientTimeout) throws IOException {
        long startTime = System.currentTimeMillis();
        HttpClient client = null;
        RequestConfig requestConfig = RequestConfig.custom()
                .setSocketTimeout(apiClientTimeout)
                .setConnectTimeout(apiClientTimeout)
                .setConnectionRequestTimeout(apiClientTimeout)
                .build();

            client = HttpClientBuilder.create().build();
        HttpGet get = new HttpGet(url);
        get.setConfig(requestConfig);
        get.addHeader("User-Agent", USER_AGENT);
        HttpResponse response = client.execute(get);
        BufferedReader rd = new BufferedReader(
                new InputStreamReader(response.getEntity().getContent(), "UTF-8"));
        StringBuilder result = new StringBuilder();
        String line;
        while ((line = rd.readLine()) != null) {
            result.append(line);
        }
        long endTime = System.currentTimeMillis();
        long duration = (endTime - startTime);
        logger.debug("getForStringResult GET:" + url + " time working: " + duration + " milliseconds");
        return result.toString();
    }

    /**
     * Создать url для запроса
     *
     * @param parameters parameters
     * @return url
     */

    public URI buildRequestUri(String url, LinkedHashMap<String, String> parameters) {
        try {
            URIBuilder builder = new URIBuilder(url);
            builder.addParameter("key", key);
            for (String key : parameters.keySet()) {
                builder.addParameter(key, parameters.get(key));
            }
            return builder.build();
        } catch (URISyntaxException e) {
            throw new RuntimeException("unable to build request URI: " + e.getMessage());
        }
    }
}

