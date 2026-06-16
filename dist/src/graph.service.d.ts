import { ConfigService } from '@nestjs/config';
import { Company } from "../interfaces/state.interface";
export declare class GraphService {
    private configService;
    private readonly appGraph;
    constructor(configService: ConfigService);
    private readonly threadConfig;
    start(): Promise<any>;
    getInputCompanies(): Company[];
    getState(): Promise<any>;
    resume(approve: boolean, risk?: number): Promise<any>;
}
