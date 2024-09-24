# @hellocoop/cdk-client

A Hellō Client CDK Construct for a Lambda Function

## Quickstart

```sh
npm install @hellocoop/cdk-client
```

```TypeScript
import { HelloClientConstruct, Scope, ProviderHint  } from '@hellocoop/cdk-client'

// Create the Hello Client Lambda and functionUrl
const helloClient = new HelloClientConstruct(this, 'HelloClient', {
    clientID: CLIENT_ID,    // required = your Hellō client_id from https://console.hello.coop
    hostname: HOSTNAME,     // recommended - public hostname 

    // Optional parameters:
    //
    cookieToken?: boolean; 
    // - Set to true to enable if a cookie token is returned in the op=auth response
    //   Must be true if using the authorizer for API Gateway - see below
    loginSyncFunctionName?: string; 
    // - Name of the lambda function to trigger on login - ARN is built from current region and account
    loginSyncFunctionArn?: string;
    // - Full ARN of the lambda function to trigger on login - use if lambda is in another region or account
    providerHints?: ProviderHint[]; 
    // - Override default providers to show to new users. See https://www.hello.dev/docs/apis/wallet/#provider_hint
    scopes?: Scope[]; 
    // - Override default array of scopes to request from the user. See https://www.hello.dev/docs/scopes/
    functionName?: string; 
    // - Override default function name 'HelloClient'
    route?: string; 
    // - Override default route (/api/hellocoop)
    sameSiteStrict?: boolean; 
    // - Set to true to enable SameSite attribute to Strict
    logDebug?: boolean;
    // - Set to true to enable debug logging
    helloDomain?: string;
    // - Set to hello-beta.net to use the Hellō Beta service - note this is NOT stable!
});

// add Hello Client Lambda origin as a behavior to a Cloud Front Distribution
distribution.addBehavior(HELLO_API_ROUTE, new origins.FunctionUrlOrigin(helloClient.functionUrl), {
    viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
    allowedMethods: cf.AllowedMethods.ALLOW_ALL,
    cachePolicy: cf.CachePolicy.CACHING_DISABLED,
    originRequestPolicy: new cf.OriginRequestPolicy(this, 'hellocoop', {
        queryStringBehavior: cf.OriginRequestQueryStringBehavior.all(),
        cookieBehavior: cf.OriginRequestCookieBehavior.all(),
    }),
});

```

## loginSyncFunction

You provide this Lambda to be called on successful login. It is passed:

```json
{
    "token": "ey ... ID Token for independent verification ...",
    "payload": {
        "iss": "https://issuer.hello.coop",
        "aud": "2000a054-aa09-45a3-9f62-26e03ee9dc76",
        "nonce": "4a6fc9b2-0f47-4105-a367-b9ae0ca12784",
        "jti": "jti_MUYT099WI3g0h7MDiRuVMhHA_c7g",
        "sub": "66752aed-9cc2-4d17-875f-379b1a578f9a",
        "name": "Dick Hardt",
        "picture": "https://pictures.hello.coop/r/eebce734-44c0-4c39-8161-ba77e08091f9.jpeg",
        "email": "dick.hardt@gmail.com",
        "email_verified": true,
        "iat": 1727210134,
        "exp": 1727210434
    }
}
```

You can then 
- create a user if they don't exist
- run a policy and deny access
- change what is returned by auth
- change the path where the user will be redirected

All of the properties are optional:

```json
{  
    "accessDenied": true,           // will deny access
    "updatedAuth": {                // will update what is returned by the auth operation
        "role":"admin"
    },
    "target_uri": "/new_location"   // path to send user when complete
}
```


## Client Usage

See TBD for details

### Login
`/api/hellocoop?op=login`

### Logout
`/api/hellocoop?op=logout`

### Get Auth
`/api/hellocoop?op=auth`

## Sample

See [client-sample-stack.ts](cdk-sample/lib/client-sample-stack.ts) in [cdk-sample](cdk-sample)