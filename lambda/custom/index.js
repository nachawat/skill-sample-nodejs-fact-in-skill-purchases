/* eslint-disable no-console */
/* eslint no-use-before-define: ["error", {"functions": false}] */
/* eslint-disable prefer-destructuring */
/* eslint-disable prefer-arrow-callback */

const Alexa = require('ask-sdk');

// Add i18n modules for l10n
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');

const STRING_SPACE = ' '; // used in prompts

/*
    Function to demonstrate how to filter inSkillProduct list to get list of
    all entitled products to render Skill CX accordingly
*/
function getAllEntitledProducts(inSkillProductList) {
  const entitledProductList = inSkillProductList.filter(record => record.entitled === 'ENTITLED');
  console.log(`Currently entitled products: ${JSON.stringify(entitledProductList)}`);
  return entitledProductList;
}

function getRandomFact(facts) {
  const factIndex = Math.floor(Math.random() * facts.length);
  return facts[factIndex].fact;
}

function getFilteredFacts(handlerInput, factTypesToInclude) {
  // if no fact types are provided, lookup entitled products, and filter types accordingly
  factTypesToInclude = factTypesToInclude || getAccesibleFactTypes(handlerInput);
  // get available facts
  const factsToFilter = getFactsData(handlerInput)
  // test if all facts are accessible 
  if (factTypesToInclude.indexOf('all_access') >= 0) {
    return factsToFilter;
  }
  // filter fact based on fact types accessible
  const filteredFacts = factsToFilter
    .filter(record => factTypesToInclude.indexOf(record.type) >= 0);
  return filteredFacts;
}

function getAccesibleFactTypes(handlerInput) {
  // lookup entitled products, and filter accordingly
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  const entitledProducts = sessionAttributes.entitledProducts;
  let factTypesToInclude;
  if (entitledProducts) {
    //factTypesToInclude = entitledProducts.map(item => item.name.toLowerCase().replace(' pack', ''));
    factTypesToInclude = entitledProducts.map(item => item.referenceName.toLowerCase().replace('_pack', ''));
    factTypesToInclude.push('free');
  } else {
    // no entitled products, so just give free ones
    factTypesToInclude = ['free'];
  }
  console.log(`types to include: ${factTypesToInclude}`);
  return factTypesToInclude;
}

function getFactsData(handlerInput) {
  const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
  return requestAttributes.factData;
}

/*
    Helper function that returns a speakable list of product names from a list of
    entitled products.
*/
function getSpeakableListOfProducts(entitleProductsList) {
  const productNameList = entitleProductsList.map(item => item.name);
  let productListSpeech = productNameList.join(', '); // Generate a single string with comma separated product names
  productListSpeech = productListSpeech.replace(/_([^_]*)$/, 'and $1'); // Replace last comma with an 'and '
  return productListSpeech;
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    console.log('IN: LaunchRequestHandler.handle');

    // entitled products are obtained by request interceptor and stored in the session attributes
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const entitledProducts = sessionAttributes.entitledProducts;

    let speechText;
    const repromptText = handlerInput.t('WELCOME.REPROMPT');
    const skillName = handlerInput.t('SKILL_NAME');

    if (entitledProducts && entitledProducts.length > 0) {
      // Customer owns one or more products
      speechText = handlerInput.t('WELCOME.ENTITLED', skillName, getSpeakableListOfProducts(entitledProducts));
    } else {
      // Not entitled to anything yet.
      console.log('No entitledProducts');
      speechText = handlerInput.t('WELCOME.NO_ENTITLED', skillName);
    }

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
}; // End LaunchRequestHandler

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = handlerInput.t('HELP.PROMPT');
    const repromptText = handlerInput.t('HELP.REPROMPT');

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
};

// IF THE USER SAYS YES, THEY WANT ANOTHER FACT.
const YesHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent' ||
        handlerInput.requestEnvelope.request.intent.name === 'GetRandomFactIntent');
  },
  handle(handlerInput) {
    console.log('In YesHandler');

    // reduce fact list to those purchased
    const filteredFacts = getFilteredFacts(handlerInput);

    const speakOutput = handlerInput.t('FACT.SPEECH', 'random', getRandomFact(filteredFacts)) + STRING_SPACE + handlerInput.t('FACT.ANOTHER');
    const repromptOutput = handlerInput.t('FACT.ANOTHER');

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  },
};

// IF THE USER SAYS NO, THEY DON'T WANT ANOTHER FACT.  EXIT THE SKILL.
const NoHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
  },
  handle(handlerInput) {
    console.log('IN: NoHandler.handle');

    const speakOutput = handlerInput.t('GOODBYE');
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const GetCategoryFactHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'GetCategoryFactIntent';
  },
  handle(handlerInput) {
    console.log('In GetCategoryFactHandler');

    const factCategory = getResolvedId(handlerInput.requestEnvelope, 'factCategory');
    console.log(`FACT CATEGORY = XX ${factCategory} XX`);

    // IF THERE WAS NOT AN ENTITY RESOLUTION MATCH FOR THIS SLOT VALUE
    if (factCategory === undefined) {
      const slotValue = getSpokenValue(handlerInput.requestEnvelope, 'factCategory');
      let speakPrefix = '';
      if (slotValue !== undefined) {
        speakPrefix = handlerInput.t('FACT.UNRESOLVED.PROMPT_PREFIX', slotValue);
      }
      const speakOutput = handlerInput.t('FACT.UNRESOLVED.PROMPT', speakPrefix);
      const repromptOutput = handlerInput.t('FACT.UNRESOLVED.REPROMPT');

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }

    // these are all used somewhere in the switch statement
    let speakOutput;
    let repromptOutput;
    let filteredFacts;
    let upsellMessage;
    let locale;
    let ms;
    let subscription;
    let categoryProduct;
    let categoryFacts;

    switch (factCategory) {
      case 'free':
        // don't need to buy 'free' category, so give what was asked
        categoryFacts = getFilteredFacts(handlerInput, [factCategory]);
        speakOutput = handlerInput.t('FACT.SPEECH', factCategory, getRandomFact(categoryFacts)) + STRING_SPACE + handlerInput.t('FACT.ANOTHER');
        repromptOutput = handlerInput.t('FACT.ANOTHER');
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      case 'random':
      case 'all_access':
        // choose from the available facts based on entitlements
        filteredFacts = getFilteredFacts(handlerInput);
        speakOutput = handlerInput.t('FACT.SPEECH', 'random', getRandomFact(filteredFacts)) + STRING_SPACE + handlerInput.t('FACT.ANOTHER');
        repromptOutput = handlerInput.t('FACT.ANOTHER');
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      default:
        // IF THERE WAS AN ENTITY RESOLUTION MATCH FOR THIS SLOT VALUE
        categoryFacts = getFilteredFacts(handlerInput, [factCategory]);
        locale = handlerInput.requestEnvelope.request.locale;
        ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

        return ms.getInSkillProducts(locale).then(function checkForProductAccess(result) {
          subscription = result.inSkillProducts.filter(record => record.referenceName === 'all_access');
          categoryProduct = result.inSkillProducts.filter(record => record.referenceName === `${factCategory}_pack`);

          // IF USER HAS ACCESS TO THIS PRODUCT
          if (isEntitled(subscription) || isEntitled(categoryProduct)) {
            speakOutput = handlerInput.t('FACT.SPEECH', factCategory, getRandomFact(categoryFacts)) + STRING_SPACE + handlerInput.t('FACT.ANOTHER');
            repromptOutput = handlerInput.t('FACT.ANOTHER');

            return handlerInput.responseBuilder
              .speak(speakOutput)
              .reprompt(repromptOutput)
              .getResponse();
          }

          if (categoryProduct[0]) {
            // the category requested is an available product
            upsellMessage = handlerInput.t('FACT.UPSELL', factCategory, categoryProduct[0].summary);

            return handlerInput.responseBuilder
              .addDirective({
                type: 'Connections.SendRequest',
                name: 'Upsell',
                payload: {
                  InSkillProduct: {
                    productId: categoryProduct[0].productId,
                  },
                  upsellMessage: upsellMessage,
                },
                token: 'correlationToken',
              })
              .getResponse();
          }

          // no category for what was requested
          // either product not created or not available
          console.log(`ALERT!  The category **${factCategory}** seemed to be valid, but no matching product was found. `
            + ' This could be due to no ISPs being created and linked to the skill, the ISPs being created '
            + ' incorrectly, the locale not supporting ISPs, or the customer\'s account being from an unsupported marketplace.');

          speakOutput = handlerInput.t('FACT.ERROR', factCategory) + STRING_SPACE + handlerInput.t('FACT.ANOTHER');
          repromptOutput = handlerInput.t('FACT.ANOTHER');

          return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
        });
    }
  },
};


// Following handler demonstrates how skills can handle user requests to discover what
// products are available for purchase in-skill.
// Use says: Alexa, ask Premium facts what can i buy
const WhatCanIBuyHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'WhatCanIBuyIntent';
  },
  handle(handlerInput) {
    console.log('In WhatCanIBuy Handler');

    // Inform the user about what products are available for purchase
    let speakOutput;
    const repromptOutput = handlerInput.t('PRODUCTS.REPROMPT');
    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    return ms.getInSkillProducts(locale).then(function fetchPurchasableProducts(result) {
      const purchasableProducts = result.inSkillProducts.filter(record => record.entitled === 'NOT_ENTITLED' && record.purchasable === 'PURCHASABLE');

      if (purchasableProducts.length > 0) {
        speakOutput = handlerInput.t('PRODUCTS.FOR_PURCHASE', getSpeakableListOfProducts(purchasableProducts));

        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      }
      // no products!
      console.log('!!! ALERT !!!  The product list came back as empty.  This could be due to no ISPs being created and linked to the skill, the ISPs being created '
        + ' incorrectly, the locale not supporting ISPs, or the customer\'s account being from an unsupported marketplace.');
      speakOutput = handlerInput.t('PRODUCTS.NO_MORE_FOR_PURCHASE');

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    });
  },
};

// Following handler demonstrates how skills can handle user requests to discover what
// products are available for purchase in-skill.
// Use says: Alexa, ask Premium facts to tell me about the history pack
const ProductDetailHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'ProductDetailIntent';
  },
  handle(handlerInput) {
    console.log('IN PRODUCT DETAIL HANDLER');

    // Describe the requested product to the user using localized information
    // from the entitlements API

    let productCategory = getResolvedId(handlerInput.requestEnvelope, 'productCategory');
    const spokenCategory = getSpokenValue(handlerInput.requestEnvelope, 'productCategory');

    // nothing spoken for the slot value
    if (spokenCategory === undefined) {
      return handlerInput.responseBuilder
        .addDelegateDirective()
        .getResponse();
    }

    // NO ENTITY RESOLUTION MATCH
    if (productCategory === undefined) {
      const speakOutput = handlerInput.t('PRODUCTS.UNKNOWN');
      const repromptOutput = handlerInput.t('PRODUCTS.UNKNOWN_REPROMPT');
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }

    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    return ms.getInSkillProducts(locale).then(function fetchProductDetails(result) {
      let speakOutput, repromptOutput;

      if (productCategory !== 'all_access') {
        productCategory += '_pack';
      }

      const product = result.inSkillProducts
        .filter(record => record.referenceName === productCategory);

      if (isProduct(product)) {
        speakOutput = handlerInput.t('PRODUCTS.DETAIL', product[0].summary, product[0].name);
        repromptOutput = handlerInput.t('PRODUCTS.DETAIL_REPROMPT', product[0].name, product[0].name);
      } else {
        console.log(`!!! ALERT !!!  The requested product **${productCategory}** could not be found.  This could be due to no ISPs being created and linked to the skill, the ISPs being created `
          + ' incorrectly, the locale not supporting ISPs, or the customer\'s account being from an unsupported marketplace.');
        speakOutput = handlerInput.t('PRODUCTS.UNKNOWN');
        repromptOutput = handlerInput.t('PRODUCTS.UNKNOWN_REPROMPT');
      }

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    });
  },
};

// Following handler demonstrates how Skills would receive Buy requests from customers
// and then trigger a Purchase flow request to Alexa
const BuyHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'BuyIntent';
  },
  handle(handlerInput) {
    console.log('IN: BuyHandler.handle');

    // Inform the user about what products are available for purchase

    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    return ms.getInSkillProducts(locale).then(function initiatePurchase(result) {
      let productCategory = getResolvedId(handlerInput.requestEnvelope, 'productCategory');

      // NO ENTITY RESOLUTION MATCH
      if (productCategory === undefined) {
        productCategory = 'all_access';
      } else if (productCategory !== 'all_access') {
        productCategory += '_pack';
      }

      const product = result.inSkillProducts
        .filter(record => record.referenceName === productCategory);

      if (product.length > 0) {
        return handlerInput.responseBuilder
          .addDirective({
            type: 'Connections.SendRequest',
            name: 'Buy',
            payload: {
              InSkillProduct: {
                productId: product[0].productId,
              },
            },
            token: 'correlationToken',
          })
          .getResponse();
      }

      // requested product didn't match something from the catalog
      console.log(`!!! ALERT !!!  The requested product **${productCategory}** could not be found.  This could be due to no ISPs being created and linked to the skill, the ISPs being created `
        + ' incorrectly, the locale not supporting ISPs, or the customer\'s account being from an unsupported marketplace.');

      const speakOutput = handlerInput.t('PRODUCTS.UNKNOWN');
      const repromptOutput = handlerInput.t('PRODUCTS.UNKNOWN_REPROMPT');
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    });
  },
};

// Following handler demonstrates how Skills would receive Cancel requests from customers
// and then trigger a cancel request to Alexa
// User says: Alexa, ask <skill name> to cancel <product name>
const CancelSubscriptionHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'CancelSubscriptionIntent';
  },
  handle(handlerInput) {
    console.log('IN: CancelSubscriptionHandler.handle');

    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    return ms.getInSkillProducts(locale).then(function initiateCancel(result) {
      let productCategory = getResolvedId(handlerInput.requestEnvelope, 'productCategory');

      if (productCategory === undefined) {
        productCategory = 'all_access';
      } else if (productCategory !== 'all_access') {
        productCategory += '_pack';
      }

      const product = result.inSkillProducts
        .filter(record => record.referenceName === productCategory);

      if (product.length > 0) {
        return handlerInput.responseBuilder
          .addDirective({
            type: 'Connections.SendRequest',
            name: 'Cancel',
            payload: {
              InSkillProduct: {
                productId: product[0].productId,
              },
            },
            token: 'correlationToken',
          })
          .getResponse();
      }

      // requested product didn't match something from the catalog
      console.log(`!!! ALERT !!!  The requested product **${productCategory}** could not be found.  This could be due to no ISPs being created and linked to the skill, the ISPs being created `
        + ' incorrectly, the locale not supporting ISPs, or the customer\'s account being from an unsupported marketplace.');

      const speakOutput = handlerInput.t('PRODUCTS.UNKNOWN');
      const repromptOutput = handlerInput.t('PRODUCTS.UNKNOWN_REPROMPT');
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    });
  },
};

// THIS HANDLES THE CONNECTIONS.RESPONSE EVENT AFTER A BUY or UPSELL OCCURS.
const BuyResponseHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'Connections.Response' &&
      (handlerInput.requestEnvelope.request.name === 'Buy' ||
        handlerInput.requestEnvelope.request.name === 'Upsell');
  },
  handle(handlerInput) {
    console.log('IN: BuyResponseHandler.handle');

    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const productId = handlerInput.requestEnvelope.request.payload.productId;

    return ms.getInSkillProducts(locale).then(function handlePurchaseResponse(result) {
      const product = result.inSkillProducts.filter(record => record.productId === productId);

      const productKey = product[0].referenceName.replace('_pack', '').replace('all_access', '');
      let productName = '';
      if (productKey && productKey.length > 0) {
        productName = handlerInput.t('CATEGORY.' + productKey.toUpperCase());
      }
      console.log(`PRODUCT = ${JSON.stringify(product)}`);
      if (handlerInput.requestEnvelope.request.status.code === '200') {
        let speakOutput;
        let repromptOutput;
        let filteredFacts;
        switch (handlerInput.requestEnvelope.request.payload.purchaseResult) {
          case 'ACCEPTED':
            filteredFacts = getFilteredFacts(handlerInput, [product[0].referenceName.replace('_pack', '')]);
            speakOutput = handlerInput.t('BUY.ACCEPTED', product[0].name) + STRING_SPACE
              + handlerInput.t('FACT.SPEECH', productName, getRandomFact(filteredFacts)) + STRING_SPACE
              + handlerInput.t('FACT.ANOTHER');
            repromptOutput = handlerInput.t('FACT.ANOTHER');
            break;
          case 'DECLINED':
            if (handlerInput.requestEnvelope.request.name === 'Buy') {
              // response when declined buy request
              speakOutput = handlerInput.t('BUY.DECLINED', product[0].name) + STRING_SPACE + handlerInput.t('FACT.ANOTHER');
              repromptOutput = handlerInput.t('FACT.ANOTHER');
              break;
            }
            // response when declined upsell request
            filteredFacts = getFilteredFacts(handlerInput);
            speakOutput = handlerInput.t('FACT.SPEECH', 'random', getRandomFact(filteredFacts)) + STRING_SPACE + handlerInput.t('FACT.ANOTHER');
            repromptOutput = handlerInput.t('FACT.ANOTHER');
            break;
          case 'ALREADY_PURCHASED':
            // may have access to more than what was asked for, but give them a random
            // fact from the product they asked to buy
            filteredFacts = getFilteredFacts(handlerInput, [product[0].referenceName.replace('_pack', '')]);
            speakOutput = handlerInput.t('FACT.SPEECH', productName, getRandomFact(filteredFacts)) + STRING_SPACE + handlerInput.t('FACT.ANOTHER');
            repromptOutput = handlerInput.t('FACT.ANOTHER');
            break;
          default:
            console.log(`unhandled purchaseResult: ${handlerInput.requestEnvelope.payload.purchaseResult}`);
            speakOutput = handlerInput.t('BUY.ERROR', product[0].name) + STRING_SPACE + handlerInput.t('FACT.ANOTHER');
            repromptOutput = handlerInput.t('FACT.ANOTHER');
            break;
        }
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      }
      // Something failed.
      console.log(`Connections.Response indicated failure. error: ${handlerInput.requestEnvelope.request.status.message}`);

      const speakOutput = handlerInput.t('PURCHASE.ERROR');
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
    });
  },
};

// THIS HANDLES THE CONNECTIONS.RESPONSE EVENT AFTER A CANCEL OCCURS.
const CancelResponseHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'Connections.Response' &&
      handlerInput.requestEnvelope.request.name === 'Cancel';
  },
  handle(handlerInput) {
    console.log('IN: CancelResponseHandler.handle');

    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const productId = handlerInput.requestEnvelope.request.payload.productId;

    return ms.getInSkillProducts(locale).then(function handleCancelResponse(result) {
      const product = result.inSkillProducts.filter(record => record.productId === productId);
      console.log(`PRODUCT = ${JSON.stringify(product)}`);
      if (handlerInput.requestEnvelope.request.status.code === '200') {
        if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'ACCEPTED') {
          const speakOutput = handlerInput.t('PURCHASE.CANCEL') + STRING_SPACE + handlerInput.t('FACT.ANOTHER');
          const repromptOutput = handlerInput.t('FACT.ANOTHER');
          return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
        }
        if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'NOT_ENTITLED') {
          const speakOutput = handlerInput.t('PURCHASE.NOTHING_TO_CANCEL') + STRING_SPACE + handlerInput.t('FACT.ANOTHER');
          const repromptOutput = handlerInput.t('FACT.ANOTHER');
          return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
        }
      }
      // Something failed.
      console.log(`Connections.Response indicated failure. error: ${handlerInput.requestEnvelope.request.status.message}`);

      const speakOutput = handlerInput.t('PURCHASE.ERROR');
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
    });
  },
};

const SessionEndedHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest' ||
      (handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent') ||
      (handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent');
  },
  handle(handlerInput) {
    console.log('IN: SessionEndedHandler.handle');

    const speakOutput = handlerInput.t('GOODBYE');
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const FallbackHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    console.log('IN FallbackHandler');

    const speakOutput = handlerInput.t('ERROR');
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${JSON.stringify(error.message)}`);
    console.log(`handlerInput: ${JSON.stringify(handlerInput)}`);
    
    const speakOutput = handlerInput.t('ERROR');
    
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

function getResolvedId(requestEnvelope, slotName) {
  if (requestEnvelope &&
    requestEnvelope.request &&
    requestEnvelope.request.intent &&
    requestEnvelope.request.intent.slots &&
    requestEnvelope.request.intent.slots[slotName] &&
    requestEnvelope.request.intent.slots[slotName].resolutions &&
    requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority &&
    requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0] &&
    requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0].values &&
    requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0].values[0] &&
    requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0].values[0].value &&
    requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0].values[0].value.id) {
    return requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0].values[0].value.id;
  }
  return undefined;
}

function getSpokenValue(requestEnvelope, slotName) {
  if (requestEnvelope &&
    requestEnvelope.request &&
    requestEnvelope.request.intent &&
    requestEnvelope.request.intent.slots &&
    requestEnvelope.request.intent.slots[slotName] &&
    requestEnvelope.request.intent.slots[slotName].value) {
    return requestEnvelope.request.intent.slots[slotName].value;
  }
  return undefined;
}

function isProduct(product) {
  return product &&
    product.length > 0;
}

function isEntitled(product) {
  return isProduct(product) &&
    product[0].entitled === 'ENTITLED';
}

const RequestLog = {
  process(handlerInput) {
    console.log(`REQUEST ENVELOPE = ${JSON.stringify(handlerInput.requestEnvelope)}`);
  },
};

const EntitledProductsCheck = {
  async process(handlerInput) {
    if (handlerInput.requestEnvelope.session.new === true) {
      // new session, check to see what products are already owned.
      try {
        const locale = handlerInput.requestEnvelope.request.locale;
        const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
        const result = await ms.getInSkillProducts(locale);
        const entitledProducts = getAllEntitledProducts(result.inSkillProducts);
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.entitledProducts = entitledProducts;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
      } catch (error) {
        console.log(`Error calling InSkillProducts API: ${error}`);
      }
    }
  },
};

const ResponseLog = {
  process(handlerInput) {
    console.log(`RESPONSE BUILDER = ${JSON.stringify(handlerInput)}`);
    console.log(`RESPONSE = ${JSON.stringify(handlerInput.responseBuilder.getResponse())}`);
  },
};

const FactDataLoader = {
  process(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const language = locale.split("-")[0];
    // eslint-disable-next-line global-require
    const localizedFacts = require(`./i18n/facts-${language}.js`);
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    requestAttributes.factData = localizedFacts.ALL_FACTS;
  }
}

/**
 * Request Interceptor for i18n handling
 */
const LocalizationInterceptor = {
  process(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;
    const language = locale.split("-")[0];
    let languageStrings = {};
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // load language strings if exist (e.g fr.js)
    try {
      if (fs.existsSync(`./i18n/${language}.js`)) {
        // eslint-disable-next-line global-require
        languageStrings[language] = require(`./i18n/${language}.js`);
      }
    } catch (err) {
      console.log(`Error while loading file : ./i18n/${language}.js : ${err}`)
    }
    // load locale strings if exist (e.g fr-FR.js)
    try {
      if (fs.existsSync(`./i18n/${locale}.js`)) {
        // eslint-disable-next-line global-require
        languageStrings[locale] = require(`./i18n/${locale}.js`);
      }
    } catch (err) {
      console.log(`Error while loading file : ./i18n/${locale}.js : ${err}`)
    }
    // init i18n
    const localizationClient = i18n.use(sprintf).init({
      lng: locale,
      fallbackLng: 'en', // fallback to EN if locale doesn't exist
      resources: languageStrings
    });
    // define l10n function
    localizationClient.localize = function () {
      const args = arguments;
      let values = [];

      for (var i = 1; i < args.length; i++) {
        values.push(args[i]);
      }
      const value = i18n.t(args[0], {
        returnObjects: true,
        postProcess: 'sprintf',
        sprintf: values
      });

      if (Array.isArray(value)) {
        return value[Math.floor(Math.random() * value.length)];
      } else {
        return value;
      }
    }
    // define function at handlerInput and RequestAttributes levels
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    handlerInput.t = attributes.t = function (...args) { // pass on arguments to the localizationClient
      return localizationClient.localize(...args);
    };
  }
}

exports.handler = Alexa.SkillBuilders.standard()
  .addRequestHandlers(
    LaunchRequestHandler,
    YesHandler,
    NoHandler,
    GetCategoryFactHandler,
    BuyResponseHandler,
    CancelResponseHandler,
    WhatCanIBuyHandler,
    ProductDetailHandler,
    BuyHandler,
    CancelSubscriptionHandler,
    SessionEndedHandler,
    HelpHandler,
    FallbackHandler,
  )
  .addRequestInterceptors(
    RequestLog,
    EntitledProductsCheck,
    LocalizationInterceptor,
    FactDataLoader
  )
  .addResponseInterceptors(ResponseLog)
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent('sample/premium-fact/v1')
  .lambda();
