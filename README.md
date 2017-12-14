# express-frisk 
Express Middleware to Validate Requests

### Usage Example 

Check lib/frisk.js for the available types. 

```javascript
const frisk = require(express-frisk);

router.get('/:id',
    frisk.validateRequest({
        id: {
            type: frisk.types.integer,
            required: true
        },
        someObject: {
            type: frist.types.object,
            required: true,
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
    var strict = true;
    frisk.validateRequest(schema, strict);
    (req, res, next) => {
        res.status(200).send('Hello World');
    });
});

```

