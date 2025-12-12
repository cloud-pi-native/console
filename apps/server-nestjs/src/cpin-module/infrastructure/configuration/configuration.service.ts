import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigurationService {
    // @TODO: Rework this with proper environment handling
    public readonly environment = 'development';
}
