"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphService = void 0;
const langgraph_1 = require("@langchain/langgraph");
const openai_1 = require("@langchain/openai");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const langchain_1 = require("@langfuse/langchain");
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const RiskSchema = zod_1.z.object({
    riskScore: zod_1.z.number().min(1).max(5).describe("The general risk profile score from 1 to 5"),
});
const StateAnnotation = langgraph_1.Annotation.Root({
    companies: (0, langgraph_1.Annotation)(),
    draft: (0, langgraph_1.Annotation)(),
    portfolioOverview: (0, langgraph_1.Annotation)(),
});
let GraphService = class GraphService {
    configService;
    appGraph;
    constructor(configService) {
        this.configService = configService;
        const llm = new openai_1.ChatOpenAI({
            model: 'gpt-4o-mini',
            apiKey: this.configService.get('OPENAI_API_KEY'),
        });
        const scoreCompanies = async (state) => {
            const updatedCompanies = await Promise.all(state.companies.map(async (company) => {
                if (!company.risk) {
                    const structuredLlm = llm.withStructuredOutput(RiskSchema);
                    const response = await structuredLlm.invoke([
                        {
                            role: "system",
                            content: "You are a risk assessment AI. Analyze the company and provide a risk score from 1 to 5. (where 1 is low risk)"
                        },
                        { role: "user", content: JSON.stringify(company) },
                    ]);
                    return {
                        ...company,
                        risk: response.riskScore,
                    };
                }
                return company;
            }));
            return { companies: updatedCompanies };
        };
        const humanReview = async (state) => {
            const approvedCompanies = [];
            for (const company of state.companies) {
                const decision = (0, langgraph_1.interrupt)({
                    company,
                    message: `Please approve or reject: ${company.name} (${company.ticker})`,
                });
                if (decision?.approve) {
                    const finalCompany = (decision.risk != null)
                        ? { ...company, risk: decision.risk }
                        : company;
                    approvedCompanies.push(finalCompany);
                }
            }
            return { companies: approvedCompanies };
        };
        const generateOverview = async (state) => {
            if (!state.companies || state.companies.length === 0) {
                return { portfolioOverview: 'No companies were approved — nothing to summarize.' };
            }
            const companySummaries = state.companies
                .map(c => `${c.name} (${c.ticker}) — Risk: ${c.risk ?? 'N/A'}`)
                .join('\n');
            const response = await llm.invoke([
                {
                    role: 'system',
                    content: 'You are a financial analyst. Given the list of approved portfolio companies below, ' +
                        'write a concise portfolio overview (3-5 sentences). Highlight overall risk profile, ' +
                        'sector diversity, and any notable observations.',
                },
                { role: 'user', content: companySummaries },
            ]);
            return { portfolioOverview: response.content };
        };
        const workflow = new langgraph_1.StateGraph(StateAnnotation)
            .addNode("scoreCompanies", scoreCompanies)
            .addNode("humanReview", humanReview)
            .addNode("generateOverview", generateOverview)
            .addEdge(langgraph_1.START, "scoreCompanies")
            .addEdge("scoreCompanies", "humanReview")
            .addEdge("humanReview", "generateOverview")
            .addEdge("generateOverview", langgraph_1.END);
        const memory = new langgraph_1.MemorySaver();
        this.appGraph = workflow.compile({ checkpointer: memory });
    }
    threadConfig = { configurable: { thread_id: "1" } };
    async start() {
        const inputData = this.getInputCompanies();
        const initialState = {
            companies: inputData
        };
        const langfuseHandler = new langchain_1.CallbackHandler({
            tags: ['langgraph', 'portfolio-review'],
        });
        const result = await this.appGraph.invoke(initialState, {
            ...this.threadConfig,
            callbacks: [langfuseHandler],
        });
        console.log('Graph paused or completed.');
        return result;
    }
    getInputCompanies() {
        const inputPath = path.join(process.cwd(), 'data', 'inputCompanies.json');
        return JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    }
    async getState() {
        const state = await this.appGraph.getState(this.threadConfig);
        return state;
    }
    async resume(approve, risk) {
        const resumePayload = { approve };
        if (risk != null) {
            resumePayload.risk = risk;
        }
        const langfuseHandler = new langchain_1.CallbackHandler({
            tags: ['langgraph', 'portfolio-review'],
        });
        const result = await this.appGraph.invoke(new langgraph_1.Command({ resume: resumePayload }), {
            ...this.threadConfig,
            callbacks: [langfuseHandler],
        });
        return result;
    }
};
exports.GraphService = GraphService;
exports.GraphService = GraphService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GraphService);
//# sourceMappingURL=graph.service.js.map