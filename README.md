# express-frisk 
Express Middleware to Validate Requests

### Usage Example 

Check lib/frisk.js for the available types.  Use either 'body', 'params', or 'query' for the `in` property. Only specify
`in` at the top level.

```javascript
const frisk = require(express-frisk);

router.get('/:id',
    frisk.validateRequest({
        id: {
            type: frisk.types.integer,
            in: 'query',
            required: true
        },
        someObject: {
            type: frisk.types.object,
            required: true,
            in: 'body',
            properties: {
                foo: {
                    type: frisk.types.string,
                    required: true,
                }
            }
        }
    }),
    (req, res, next) => {
        res.status(200).send('Hello World');
    });
```

In strict mode a request is rejected if it contains an item that isn't explicitly defined in the schema.
Strict mode is turned off by default, and enabled on a per-request basis:

```javascript

/// validate in strict mode:

router.get('/:id', 
    frisk.validateRequest(schema, true),  // strict=true
    (req, res, next) => {
        res.status(200).send('Hello World');
    });
```

