// sample login sync
exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    return { test: "Hellō World!" };
    // return {
    //   statusCode: 200,
    //   body: "{}",
    // };
  };
  