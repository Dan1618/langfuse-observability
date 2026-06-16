"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const graph_service_1 = require("./graph.service");
let AppController = class AppController {
    graphService;
    constructor(graphService) {
        this.graphService = graphService;
    }
    root() {
        const companies = this.graphService.getInputCompanies();
        return { companies };
    }
    async start() {
        const result = await this.graphService.start();
        const state = await this.graphService.getState();
        return {
            status: 'paused_for_review',
            interrupts: state.tasks?.map((t) => t.interrupts).flat() ?? [],
        };
    }
    async getState() {
        const state = await this.graphService.getState();
        return {
            next: state.next,
            interrupts: state.tasks?.map((t) => t.interrupts).flat() ?? [],
            values: state.values,
        };
    }
    async review(body) {
        const risk = body.risk != null ? Number(body.risk) : undefined;
        const result = await this.graphService.resume(body.approve, risk);
        const state = await this.graphService.getState();
        const pendingInterrupts = state.tasks?.map((t) => t.interrupts).flat() ?? [];
        if (pendingInterrupts.length > 0) {
            return {
                status: 'paused_for_review',
                interrupts: pendingInterrupts,
            };
        }
        return {
            status: 'completed',
            companies: result.companies,
            portfolioOverview: result.portfolioOverview,
        };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.Render)('index'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "root", null);
__decorate([
    (0, common_1.Post)('start'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "start", null);
__decorate([
    (0, common_1.Get)('state'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getState", null);
__decorate([
    (0, common_1.Post)('review'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "review", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [graph_service_1.GraphService])
], AppController);
//# sourceMappingURL=graph.controller.js.map