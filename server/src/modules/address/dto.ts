import { IsBoolean, IsLatitude, IsLongitude, IsOptional, IsString, Length } from 'class-validator';

export class SaveAddressDto {
  @IsString()
  @Length(1, 30)
  name: string;

  @IsString()
  @Length(6, 20)
  phone: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  province?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  district?: string;

  @IsString()
  @Length(1, 200)
  detail: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  locationName?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  @Length(0, 12)
  adcode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

