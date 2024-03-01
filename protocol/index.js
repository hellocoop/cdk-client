"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const router_1 = require("@hellocoop/router");
const cookie_1 = require("cookie");
// Load environment variables
const { CLIENT_ID, HELLO_COOKIE_SECRET } = process.env;
// Load configuration
const config = require('./hello.config.js');
if (!router_1.isConfigured)
    (0, router_1.configure)(config);
const convertToHelloRequest = (event) => {
    const { headers, cookies, queryStringParameters, requestContext } = event;
    let auth = undefined;
    return {
        headers: () => headers,
        query: queryStringParameters,
        path: requestContext?.http?.path,
        getAuth: () => auth,
        setAuth: (a) => { auth = a; },
        method: requestContext?.http?.method,
        body: () => event.body,
    };
};
const convertToHelloResponse = (response) => {
    const send = (data) => {
        if (!response?.headers)
            response.headers = {};
        response.headers['Content-Type'] = 'text/html';
        response.body = data;
        return response;
    };
    return {
        clearAuth: () => {
            const { name, value, options } = (0, router_1.clearAuthCookieParams)();
            if (!response?.cookies)
                response.cookies = [];
            response.cookies.push((0, cookie_1.serialize)(name, value, options));
        },
        send,
        json: (data) => {
            if (!response?.headers)
                response.headers = {};
            response.headers['Content-Type'] = 'application/json';
            response.body = JSON.stringify(data);
        },
        redirect: (url) => {
            if (!response?.headers)
                response.headers = {};
            response.headers['Location'] = url;
            response.statusCode = 302;
        },
        setCookie: (name, value, options) => {
            if (!response?.cookies)
                response.cookies = [];
            response.cookies.push((0, cookie_1.serialize)(name, value, options));
        },
        setHeader: (name, value) => {
            if (!response?.headers)
                response.headers = {};
            response.headers[name] = value;
        },
        status: (statusCode) => {
            response.statusCode = statusCode;
            return { send };
        },
    };
};
const handler = async (event, context) => {
    const { headers, cookies, queryStringParameters, body, isBase64Encoded, requestContext } = event;
    const method = requestContext?.http?.method;
    const path = requestContext?.http?.path;
    const content = JSON.stringify({
        HELLO_COOKIE_SECRET,
        CLIENT_ID,
        method,
        path,
        headers,
        cookies,
        queryStringParameters,
        body,
        isBase64Encoded,
    }, null, 2);
    console.log('event', content);
    const result = {
        statusCode: 200
    };
    const helloReq = convertToHelloRequest(event);
    const helloRes = convertToHelloResponse(result);
    await (0, router_1.router)(helloReq, helloRes);
    return result;
};
exports.handler = handler;
