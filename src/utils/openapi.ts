import SwaggerParser from '@apidevtools/swagger-parser';
import yaml from 'js-yaml';
import type {OpenAPI} from 'openapi-types';

export async function parse(specification: string): Promise<OpenAPI.Document> {
    try {
        const loaded: OpenAPI.Document = yaml.load(specification) as OpenAPI.Document;
        return await SwaggerParser.parse(loaded);
    } catch (error) {
        console.error('Error parsing the specification', error);
        throw error;
    }
}

export async function getTitle(specification: OpenAPI.Document): Promise<string> {
    return specification.info.title;
}

export async function getVersion(specification: OpenAPI.Document): Promise<string> {
    return specification.info.version;
}

export async function countOperations(specification: OpenAPI.Document): Promise<number> {
    let count = 0;
    for (const path in specification.paths) {
        if (specification.paths?.[path]) {
            count += Object.keys(specification.paths?.[path]).length;
        }
    }
    return count;
}

export async function countPaths(specification: OpenAPI.Document): Promise<number> {
    let count = 0;
    for (const path in specification.paths) {
        count++
    }
    return count;
}

export async function countPathsResponses(specification: OpenAPI.Document): Promise<number> {
    let count = 0;
    for (const path in specification.paths) {
        for (const operation in specification.paths?.[path]) {
            const element: any = specification.paths?.[path]
            count += Object.keys(element[operation].responses).length;
        }
    }
    return count;
}

export async function countInputOperations(specification: OpenAPI.Document): Promise<number> {
    let count = 0;
    for (const path in specification.paths) {
        for (const operation in specification.paths?.[path]) {
            if (operation.toLowerCase() !== 'get') {
                count++;
            }
        }
    }
    return count;
}

export async function countSuccessPathsResponses(specification: OpenAPI.Document): Promise<number> {
    let count = 0;
    for (const path in specification.paths) {
        for (const operation in specification.paths?.[path]) {
            const element: any = specification.paths?.[path]
            for (const reponse in element[operation].responses) {
                if (reponse.startsWith('1') || reponse.startsWith('2') || reponse.startsWith('3') || reponse.startsWith('4') || reponse.startsWith('6')) {
                    count++;
                }
            }
            count += Object.keys(element[operation].responses).length;
        }
    }
    return count;
}

export async function countParameters(specification: OpenAPI.Document): Promise<number> {
    let count = 0;
    for (const path in specification.paths) {
        for (const operation in specification.paths?.[path]) {
            const element: any = specification.paths?.[path]
            count += element[operation].parameters?.length || 0;
        }
    }
    return count;
}

export async function countHeaders(specification: OpenAPI.Document): Promise<number> {
    let count = 0;
    for (const path in specification.paths) {
        for (const operation in specification.paths?.[path]) {
            const element: any = specification.paths?.[path]
            count += element[operation].headers?.length || 0;
        }
    }
    return count;
}

export async function countSchemas(specification: OpenAPI.Document): Promise<number> {
    let count = 0;
    for (const path in specification.paths) {
        for (const operation in specification.paths?.[path]) {
            const element: any = specification.paths?.[path]
            count += element[operation].schemas?.length || 0;
        }
    }
    return count;
}
