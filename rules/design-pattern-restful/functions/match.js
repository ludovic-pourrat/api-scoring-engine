import { createRulesetFunction } from "@stoplight/spectral-core";

export default createRulesetFunction(
    {
        input: null,
        options: {},
    },
    (targetVal, options) => {

        if (!targetVal.requestBody || !targetVal.responses) {
            return [];
        }

        const requestSchema = targetVal?.requestBody?.content?.['application/json'];
        const responseSchemas = [
            targetVal?.responses?.['200']?.content?.['application/json'],
            targetVal?.responses?.['201']?.content?.['application/json']
        ].filter(Boolean); // Remove undefined values

        if (!requestSchema || responseSchemas.length === 0) {
            return [];
        }

        for (const responseSchema of responseSchemas) {
            if (requestSchema !== responseSchema) {
                return [
                    {
                        message: `Request body schema (${requestSchema}) does not match response body schema (${responseSchema}).`
                    },
                ];
            }
        }

        return [];
    },
);