import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  createVenueSchema,
  venueSearchSchema,
  type CreateVenueInput,
  type UserDto,
  type VenueDto,
} from '@convocados/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
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

  /** Guardar um campo escrito à mão (aparece nas sugestões a toda a gente). Limite contra spam. */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentUser() user: UserDto,
    @Body({ schema: createVenueSchema }) body: CreateVenueInput,
  ): Promise<VenueDto> {
    return this.venues.create(user.id, body);
  }
}
