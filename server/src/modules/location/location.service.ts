import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';

interface TencentReverseGeocodeResponse {
  status: number;
  message?: string;
  result?: {
    address?: string;
    formatted_addresses?: {
      recommend?: string;
      rough?: string;
    };
    address_component?: {
      province?: string;
      city?: string;
      district?: string;
    };
    ad_info?: {
      adcode?: string;
    };
  };
}

@Injectable()
export class LocationService {
  async reverseGeocode(latitude: number, longitude: number) {
    const key = process.env.TENCENT_MAP_KEY;
    if (!key) {
      throw new ServiceUnavailableException('腾讯地图 Key 未配置');
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('经纬度格式不正确');
    }

    try {
      const { data } = await axios.get<TencentReverseGeocodeResponse>('https://apis.map.qq.com/ws/geocoder/v1/', {
        params: {
          key,
          location: `${lat},${lng}`,
          get_poi: 0,
        },
        timeout: 5000,
      });

      if (data.status !== 0 || !data.result) {
        throw new BadRequestException(data.message || '地址解析失败');
      }

      const component = data.result.address_component || {};
      const formatted = data.result.formatted_addresses || {};
      const address = data.result.address || '';
      const recommend = formatted.recommend || formatted.rough || address;

      return {
        province: component.province || '',
        city: component.city || '',
        district: component.district || '',
        adcode: data.result.ad_info?.adcode || '',
        address,
        recommend,
        latitude: lat,
        longitude: lng,
      };
    } catch (error: any) {
      if (error?.getStatus) throw error;
      throw new ServiceUnavailableException('腾讯地图服务暂时不可用');
    }
  }
}

