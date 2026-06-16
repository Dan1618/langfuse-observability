import { GraphService } from './graph.service';
export declare class AppController {
    private readonly graphService;
    constructor(graphService: GraphService);
    root(): {
        companies: import("../interfaces/state.interface").Company[];
    };
    start(): Promise<{
        status: string;
        interrupts: any;
    }>;
    getState(): Promise<{
        next: any;
        interrupts: any;
        values: any;
    }>;
    review(body: {
        approve: boolean;
        risk?: number;
    }): Promise<{
        status: string;
        interrupts: any;
        companies?: undefined;
        portfolioOverview?: undefined;
    } | {
        status: string;
        companies: any;
        portfolioOverview: any;
        interrupts?: undefined;
    }>;
}
