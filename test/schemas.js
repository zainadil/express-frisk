'use strict';

const frisk = require('../lib/frisk');

const TestSchemas = {
    objectSchema: {
        someObject: {
            required: true,
            type: frisk.types.object,
        } 
    },
    nestedSchema: {
        someObject: {
            required: true,
            type: frisk.types.object,
            properties: {
                foo: {
                    required: true,
                    type: frisk.types.string,
                },
                bar: {
                    required: true,
                    type: frisk.types.uuid,
                }
            }
        } 
    },
    foodSchema: {
        fruit: {
            required: true,
            type: frisk.types.string
        },
        vegetable: {
            required: true,
            type: frisk.types.string
        },
        condiment: {
            required: true,
            type: frisk.types.string
        }
    },
    restaurantSchema: {
        address: {
            type: frisk.types.object,
            required: true,
            properties: {
                streetNumber: {
                    required: true,
                    type: frisk.types.number
                },
                streetName: {
                    required: true,
                    type: frisk.types.string
                },
                city: {
                    required: true,
                    type: frisk.types.string,
                },
                province: {
                    required: true,
                    type: frisk.types.string,
                },
                apartmentNumber: {
                    required: false,
                    type: frisk.types.number
                }
            }
        },
        name: {
            required: true,
            type: frisk.types.string
        },
        menus: {
            required: true,
            type: frisk.types.object,
            properties: {
                lunch: {
                    required: true,
                    type: frisk.types.object,
                    properties: {
                        appetizers: {
                            required: true,
                            type: frisk.types.arrayOfStrings
                        },
                        mains: {
                            required: true,
                            type: frisk.types.arrayOfStrings
                        },
                        desserts: {
                            required: true,
                            type: frisk.types.arrayOfStrings
                        }
                    }
                },
                dinner: {
                    required: true,
                    type: frisk.types.object,
                    properties: {
                        appetizers: {
                            required: true,
                            type: frisk.types.arrayOfStrings
                        },
                        mains: {
                            required: true,
                            type: frisk.types.arrayOfStrings
                        },
                        desserts: {
                            required: true,
                            type: frisk.types.arrayOfStrings
                        }
                    }
                }
            }
            
        }
    },

    fruitInDifferentLocations: {
        banana: {
            required: true,
            type: frisk.types.string,
            in: 'query'
        },
        strawberry: {
            required: true,
            type: frisk.types.string,
            in: 'path'
        },
        mango: {
            required: true,
            type: frisk.types.string,
            in: 'body'
        }
    },
    nestedBodySchema: {
        address: {
            type: frisk.types.object,
            in: 'body',
            required: true,
            properties: {
                streetNumber: {
                    required: true,
                    type: frisk.types.number
                },
                apartmentNumber: {
                    required: false,
                    type: frisk.types.number
                }
            }
        },
    }
};

module.exports = TestSchemas;