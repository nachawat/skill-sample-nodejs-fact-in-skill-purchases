// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

module.exports = {
    translation: {
        
        SKILL_NAME: 'Premium Facts Sample',

        WELCOME: {
            NO_ENTITLED: `Welcome to %s. To hear a random fact you can say 'Tell me a fact',
            or to hear about the premium categories for purchase, say 'What can I buy'.
            For help, say , 'Help me'... So, What can I help you with?`,
            ENTITLED: `Welcome to %s. You currently own %s
            products. To hear a random fact, you could say, 'Tell me a fact' or you can ask
            for a specific category you have purchased, for example, say 'Tell me a science fact'.
            To know what else you can buy, say, 'What can i buy?'. So, what can I help you
            with?`,
            REPROMPT: 'I didn\'t catch that. What can I help you with?'
        },

        PRODUCTS: {
            FOR_PURCHASE: `Products available for purchase at this time are %s.
            To learn more about a product, say 'Tell me more about' followed by the product name.
            If you are ready to buy, say, 'Buy' followed by the product name. So what can I help you with?`,
            NO_MORE_FOR_PURCHASE: 'There are no more products to offer to you right now. Sorry about that. Would you like a random fact instead?',
            REPROMPT: 'I didn\'t catch that. What can I help you with?',
            UNKNOWN: 'I don\'t think we have a product by that name.  Can you try again?',
            UNKNOWN_REPROMPT: 'I didn\'t catch that. Can you try again?',
            DETAIL: '%s. To buy it, say Buy %s.',
            DETAIL_REPROMPT: 'I didn\'t catch that. To buy %s, say Buy %s',
        },

        PURCHASE: {
            ERROR: 'There was an error handling your purchase request. Please try again or contact us for help.',
            CANCEL: 'You have successfully cancelled your subscription.',
            NOTHING_TO_CANCEL: 'You don\'t currently have a subscription to cancel.',

        },

        FACT: {
            SPEECH: 'Here\'s your %s fact: %s.',
            UPSELL: 'You don\'t currently own the %s pack. %s Want to learn more?',
            ERROR: 'I\'m having trouble accessing the %s facts right now. Try a different category for now.',
            ANOTHER: [
                'Would you like another fact?',
                'Can I give you another fact?',
                'Do you want to hear another fact?'
            ],
            UNRESOLVED: {
                PROMPT_PREFIX: 'I heard you say %s.',
                PROMPT: '%s I don\'t have facts for that category.  You can ask for science, space, or history facts.  Which one would you like?',
                REPROMPT: 'Which fact category would you like?  I have science, space, or history.'
            }
        },

        BUY: {
            ACCEPTED: 'You have unlocked the %s.',
            DECLINED: 'Thanks for your interest in the %s.',
            ERROR: 'Something unexpected happened, but thanks for your interest in the %s.'
        },

        CATEGORY: {
            RANDOM: 'random',
            ALL_ACCESS: 'all access',
            SPACE: 'space',
            HISTORY: 'history',
            SCIENCE: 'science',
        },

        GOODBYE: [
            'OK.  Goodbye!',
            'Have a great day!',
            'Come back again soon!',
        ],

        HELP: {
            PROMPT: `To hear a random fact, you could say, 'Tell me a fact' or you can ask,
            for a specific category you have purchased, for example, say 'Tell me a science fact'. 
            To know what else you can buy, say, 'What can i buy?'. So, what can I help you with ?`,
            REPROMPT: 'I didn\'t catch that. What can I help you with?',
        },

        ERROR: 'Sorry, I didn\'t catch that. Can you please reformulate?',

    }
}