import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { venueSearchSchema, type VenueDto } from '@convocados/shared';
import { VenuesService } from './venues.service.js';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  /** GET /venues?q=romariz&sport=football&lat=40.9&lng=-8.5&radiusKm=15 */
  @Get()
  search(@Query() raw: Record<string, string>): Promise<VenueDto[]> {
    const parsed = venueSearchSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('Pesquisa inválida.');
    const { lat, lng } = parsed.data;
    if ((lat === undefined) !== (lng === undefined)) {
      throw new BadRequestException(
        'Indica a latitude e a longitude, ou nenhuma.',
      );
    }
    return this.venues.search(parsed.data);
  }
}
