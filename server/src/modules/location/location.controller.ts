import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiResult } from '../../common/api-result';
import { LocationService } from './location.service';
import { ReverseGeocodeDto } from './dto';

@Controller('location')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private locationService: LocationService) {}

  @Post('reverse-geocode')
  async reverseGeocode(@Body() body: ReverseGeocodeDto) {
    const data = await this.locationService.reverseGeocode(body.latitude, body.longitude);
    return ApiResult.success(data);
  }
}

