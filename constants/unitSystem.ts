import type { UnitSystem } from '@/types';

export const defaultUnitSystem: UnitSystem = {
  weight: {
    baseUnit: 'kg',
    displayName: '重量',
    conversions: {
      kg: { rate: 1, displayName: '千克' },
      g: { rate: 0.001, displayName: '克' },
      mg: { rate: 0.000001, displayName: '毫克' },
      oz: { rate: 0.0283495, displayName: '盎司' },
      lb: { rate: 0.453592, displayName: '磅' },
    },
  },
  volume: {
    baseUnit: 'l',
    displayName: '体积',
    conversions: {
      l: { rate: 1, displayName: '升' },
      ml: { rate: 0.001, displayName: '毫升' },
      gal: { rate: 3.78541, displayName: '加仑' },
      floz: { rate: 0.0295735, displayName: '液体盎司' },
      cup: { rate: 0.236588, displayName: '杯' },
    },
  },
  area: {
    baseUnit: 'm2',
    displayName: '面积',
    conversions: {
      m2: { rate: 1, displayName: '平方米' },
      cm2: { rate: 0.0001, displayName: '平方厘米' },
      ft2: { rate: 0.092903, displayName: '平方英尺' },
    },
  },
  length: {
    baseUnit: 'm',
    displayName: '长度',
    conversions: {
      m: { rate: 1, displayName: '米' },
      cm: { rate: 0.01, displayName: '厘米' },
      mm: { rate: 0.001, displayName: '毫米' },
      km: { rate: 1000, displayName: '千米' },
      in: { rate: 0.0254, displayName: '英寸' },
      ft: { rate: 0.3048, displayName: '英尺' },
    },
  },
  piece: {
    baseUnit: 'piece',
    displayName: '计件',
    conversions: {
      piece: { rate: 1, displayName: '个' },
      pack: { rate: 1, displayName: '包' },
      bottle: { rate: 1, displayName: '瓶' },
      bag: { rate: 1, displayName: '袋' },
      box: { rate: 1, displayName: '盒' },
      dozen: { rate: 12, displayName: '打' },
      case: { rate: 1, displayName: '箱' },
    },
  },
};
