# express-frisk 
Express Middleware to Validate Requests

### Usage Example 

Check lib/frisk.js for the available types. 

```javascript
const frisk = require('express-frisk');

router.get('/:id',
    frisk.validateRequest({
        id: {
            type: frisk.types.integer,
            required: true
        }
    }),
    (req, res, next) => {
        res.status(200).send('Hello World');
    });
```