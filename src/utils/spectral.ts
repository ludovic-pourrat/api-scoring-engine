import * as path from "node:path";
import {Document, Spectral} from "@stoplight/spectral-core";
import * as Parsers from "@stoplight/spectral-parsers";
import {DiagnosticSeverity} from "@stoplight/types";
import {bundleAndLoadRuleset} from "@stoplight/spectral-ruleset-bundler/with-loader";
import fs from "node:fs";
import {fetch} from "@stoplight/spectral-runtime";
import OWASPRuleset from "../rules/owasp/ruleset";
import URLVersioningRuleset from "../rules/url-versioning/ruleset";
import {Category, Issue, Score} from "../models/score";
import {
    countHeaders, countInputOperations,
    countOperations,
    countParameters, countPaths,
    countPathsResponses, countSchemas,
    countSuccessPathsResponses, getTitle, getVersion,
    parse
} from "./openapi";
import type {OpenAPI} from "openapi-types";

const severityWeights: Record<string, number> = {
    [DiagnosticSeverity.Error]: -5,
    [DiagnosticSeverity.Warning]: -1,
    [DiagnosticSeverity.Information]: 0,
    [DiagnosticSeverity.Hint]: 0
};

interface OWASPTop10Categorization {
    [key: string]: string;
}

const owaspTop10APIKeys: OWASPTop10Categorization = {
    "owasp:api1": "x-api-owasp-broken-object-level-authorization",
    "owasp:api2": "x-api-owasp-broken-authentication",
    "owasp:api3": "x-api-owasp-excessive-data-exposure",
    "owasp:api4": "x-api-owasp-lack-of-resources-rate-limiting",
    "owasp:api5": "x-api-owasp-broken-function-level-authorization",
    "owasp:api6": "x-api-owasp-mass-assignment",
    "owasp:api7": "x-api-owasp-security-misconfiguration",
    "owasp:api8": "x-api-owasp-injection",
    "owasp:api9": "x-api-owasp-improper-assets-management",
    "owasp:api10": "x-api-owasp-insufficient-logging-monitoring"
};

const owaspTop10APIRules: OWASPTop10Categorization = {
    "owasp:api1": "Broken Object Level Authorization",
    "owasp:api2": "Broken Authentication",
    "owasp:api3": "Excessive Data Exposure",
    "owasp:api4": "Lack of Resources & Rate Limiting",
    "owasp:api5": "Broken Function Level Authorization",
    "owasp:api6": "Mass Assignment",
    "owasp:api7": "Security Misconfiguration",
    "owasp:api8": "Injection",
    "owasp:api9": "Improper Assets Management",
    "owasp:api10": "Insufficient Logging & Monitoring"
};

function map(ruleId: string): string {
    return owaspTop10APIRules[ruleId] || "Unknown Rule ID";
}

function key(ruleId: string): string {
    return owaspTop10APIKeys[ruleId] || "x-api-owasp-default";
}

function severityToString(severity: DiagnosticSeverity): string {
    switch (severity) {
        case DiagnosticSeverity.Error:
            return "Error";
        case DiagnosticSeverity.Warning:
            return "Warning";
        case DiagnosticSeverity.Information:
            return "Information";
        case DiagnosticSeverity.Hint:
            return "Hint";
        default:
            return "Unknown";
    }
}

export async function compute(specification: string): Promise<Score> {

    const maxAPIScore = await getAPIMaximalScore(specification);
    const maxDXScore = await getDXMaximalScore(specification);
    const maxMockingReadinessScore = await getMockingReadinessMaximalScore(specification);
    const maxDesignPatternRestfulScore = await getDesignPatternRestfulMaximalScore(specification);

    let categories: Category[] = await Promise.all([
        computeScore(specification, "conformance/.spectral.yaml", maxAPIScore, "Conformance", "x-api-conformance"),
        computeScore(specification, "dx/.spectral.yaml", maxDXScore, "Developer Experience", "x-api-dx"),
        computeScore(specification, "mocking-readiness/.spectral.yaml", maxMockingReadinessScore, "Mocking Readiness", "x-api-mocking-readiness"),
        computeScore(specification, "design-pattern-restful/.spectral.yaml", maxDesignPatternRestfulScore, "Design Pattern - Restful", "x-api-design-pattern-restful"),
    ]);

    categories = [...categories,
        ...await computeOWASPScore(specification),
        await computeURLVersioningScore(specification)];

    const totalScore = categories.reduce((score, category) => {
        const categoryScore = isNaN(category.score) ? 0 : category.score;
        return score + categoryScore;
    }, 0);
    const score = Math.round((totalScore / (100*categories.length)) * 100);

    const openapi: OpenAPI.Document = await parse(specification);

    return {score: score, title: await getTitle(openapi), version: await getVersion(openapi), categories};
}

export async function computeScore(specification: string, ruleset: string, max: number, name: string, key: string): Promise<Category> {
    const spectral = new Spectral();

    const rulesetFilepath = path.join(__dirname, ruleset);

    spectral.setRuleset(await bundleAndLoadRuleset(rulesetFilepath, {fs, fetch} as any));

    const outcomes = await spectral.run(getDocument(specification));

    const score = outcomes.reduce((score, result) => {
        const severity = result.severity as DiagnosticSeverity;
        return score + (severityWeights[severity] || 0);
    }, max);

    let percentage = Math.round((score / max) * 100);

    if (percentage < 0) {
        percentage = 0
    }

    const issues: Issue[] = outcomes.map((result) => (
        {
            code: result.code || "unknown",
            severity: severityToString(result.severity),
            message: result.message,
        }
    ));

    return {category: name, key: key, score: percentage, issues};
}

export async function computeOWASPScore(specification: string): Promise<Category[]> {
    const spectral = new Spectral();

    spectral.setRuleset(OWASPRuleset);

    const outcomes = await spectral.run(getDocument(specification));

    const maxOWASPScore = await getOWASPMaximalScore(specification);
    return computeOWASPCategories(outcomes, maxOWASPScore);
}

function computeOWASPCategories(outcomes: any[], max: number): Category[] {
    const categories = [];

    for (let i = 1; i <= 10; i++) {
        const ruleId = `owasp:api${i}`;

        const filtered = outcomes.filter((result) => {
            return typeof result.code !== "number" ? result.code?.includes(ruleId) : false;
        });

        const issues = filtered.map((result) => ({
            code: result.code || "unknown",
            severity: severityToString(result.severity),
            message: result.message,
        }));

        const score = filtered.reduce((score, result) => {
            const severity = result.severity as DiagnosticSeverity;
            return score + (severityWeights[severity] || 0);
        }, max);

        let percentage = Math.round((score / max) * 100);
        if (percentage < 0) {
            percentage = 0;
        }
        categories.push({
            score: percentage,
            issues,
            category: map(ruleId),
            key: key(ruleId)
        });
    }

    return categories;

}

export async function computeURLVersioningScore(specification: string): Promise<Category> {
    const spectral = new Spectral();

    spectral.setRuleset(URLVersioningRuleset);

    const outcomes = await spectral.run(getDocument(specification));

    const maxURLVersioningScore = await getURLVersioningMaximalScore(specification);
    const score = outcomes.reduce((score, result) => {
        const severity = result.severity as DiagnosticSeverity;
        return score + (severityWeights[severity] || 0);
    }, maxURLVersioningScore);

    let percentage = Math.round((score / maxURLVersioningScore) * 100);

    if (percentage < 0) {
        percentage = 0
    }

    const issues: Issue[] = outcomes.map((result) => (
        {
            code: result.code || "unknown",
            severity: severityToString(result.severity),
            message: result.message,
        }
    ));

    return {category: "URl Versioning", key: "x-url-versioning", score: percentage, issues};
}

function getDocument(specification: string) {
    return new Document(specification, Parsers.Yaml);
}

async function getOWASPMaximalScore(specification: string): Promise<number> {

    const openapi: OpenAPI.Document = await parse(specification);

    let count = 0;

    count += await countOperations(openapi) * 50
    count += await countSchemas(openapi) * 50
    return count;
}

async function getURLVersioningMaximalScore(specification: string): Promise<number> {

    const openapi: OpenAPI.Document = await parse(specification);

    let count = 10;

    count += await countPaths(openapi) * 5
    return count;
}

async function getDesignPatternRestfulMaximalScore(specification: string): Promise<number> {

    const openapi: OpenAPI.Document = await parse(specification);

    let count = 0;

    count += await countPaths(openapi) * 5
    return count;
}

async function getAPIMaximalScore(specification: string): Promise<number> {

    const openapi: OpenAPI.Document = await parse(specification);

    let count = 50;

    count += await countHeaders(openapi) * 10
    count += await countParameters(openapi) * 10
    count += await countInputOperations(openapi) * 50
    count += await countSuccessPathsResponses(openapi) * 25
    count += await countSchemas(openapi) * 25
    
    return count;
}

async function getDXMaximalScore(specification: string): Promise<number> {

    const openapi: OpenAPI.Document = await parse(specification);

    let count = 5+1+1;

    count += await countHeaders(openapi) * 5
    count += await countParameters(openapi) * 5
    count += await countOperations(openapi) * (5+1)
    count += await countPathsResponses(openapi) * 5

    return count;
}

async function getMockingReadinessMaximalScore(specification: string): Promise<number> {

    const openapi: OpenAPI.Document = await parse(specification);

    let count = 0;

    count += await countHeaders(openapi) * 5
    count += await countParameters(openapi) * 5
    count += await countInputOperations(openapi) * 5
    count += await countSuccessPathsResponses(openapi) * 5
    return count;
}
