# @hellocoop/cdk-client

A Hellō Client CDK Construct for a Lambda Function

## Quickstart

```sh
npm install @hellocoop/cdk-client
```

```TypeScript
import { HelloClientConstruct } from '@hellocoop/cdk-client'

// Create the Hello Client Lambda and functionUrl
const helloClient = new HelloClientConstruct(this, 'HelloClient', {
    clientID: CLIENT_ID,    // required = your Hellō client_id from https://console.hello.coop
    hostname: HOSTNAME,     // recommended - public hostname 

    // Optional parameters:
    //
    // cookieToken?: boolean; 
    // - Set to true to enable if a cookie token is returned in the op=auth response
    //   Must be true if using the authorizer for API Gateway - see below
    // loginTriggerFunctionName?: string; 
    // - Name of the lambda function to trigger on login - ARN is built from current region and account
    // loginTriggerFunctionArn?: string;
    // - Full ARN of the lambda function to trigger on login - use if lambda is in another region or account
    // providerHints?: ProviderHint[]; 
    // - Override default providers to show to new users. See https://www.hello.dev/docs/apis/wallet/#provider_hint
    // scopes?: Scope[]; 
    // - Override default array of scopes to request from the user. See https://www.hello.dev/docs/scopes/
    // functionName?: string; 
    // - Override default function name 'HelloClient'
    // route?: string; 
    // - Override default route (/api/hellocoop)
    // sameSiteStrict?: boolean; 
    // - Set to true to enable SameSite attribute to Strict
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





See TBD for details on `HelloClientConstruct`

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