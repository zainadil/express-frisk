'use strict';


const Utils = {
    // Creates a new request object
    newRequest: (fields) => { 
        return { 
            params: fields,
            query: {},
            body: {}
        };
    },

    // Createa  new response object with the provided sendFunction handler to be called
    // if the request completes successfully
    newResponse: (sendFunction) => { 
        return {
            status: (code) => {
                return {
                    send: (payload) => {
                        sendFunction(payload);
                    }
                };
            }
        };
    },

};

module.exports = Utils;
