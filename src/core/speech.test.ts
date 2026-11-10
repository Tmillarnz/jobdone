import { describe, expect, it } from 'vitest';
import { parseSpoken } from './speech';
import type { AreaKind } from './types';

const room: AreaKind = {
  id: 'room',
  name: 'Room',
  spokenDims: ['length', 'width', 'height'],
  fields: [
    { key: 'length', label: 'Length', type: 'number', say: ['long'] },
    { key: 'width', label: 'Width', type: 'number', say: ['wide'] },
    { key: 'height', label: 'Height', type: 'number', say: ['high', 'stud'] },
    { key: 'doors', label: 'Doors', type: 'integer', say: ['door'] },
    { key: 'doorWidth', label: 'Door width', type: 'number' },
    { key: 'timber', label: 'Timber window frames', type: 'integer', say: ['timber windows'] },
    { key: 'slider', label: 'Ranch slider', type: 'boolean', say: ['slider'] },
    { key: 'note', label: 'Note', type: 'text' },
  ],
};
const heard = (t: string) => parseSpoken(t, room).values;

describe('parseSpoken', () => {
  it('reads "length by width by height"', () => {
    expect(heard('4 by 3.6 by 2.4')).toEqual({ length: 4, width: 3.6, height: 2.4 });
    expect(heard('four by three point six by two point four, one door')).toEqual({ length: 4, width: 3.6, height: 2.4, doors: 1 });
    expect(heard('4m x 3.6m')).toEqual({ length: 4, width: 3.6 });
  });
  it('reads a label followed by its number', () => {
    expect(heard('Length 4 width 3.6 height is 2.4 metres')).toEqual({ length: 4, width: 3.6, height: 2.4 });
  });
  it('reads a number followed by its word', () => {
    expect(heard('4 metres long, 3.6 wide, 2.4 high, two doors and 3 timber windows')).toEqual({
      length: 4, width: 3.6, height: 2.4, doors: 2, timber: 3,
    });
  });
  it('keeps a longer label from being read as a shorter one', () => {
    expect(heard('door width 0.9, width 3')).toEqual({ doorWidth: 0.9, width: 3 });
  });
  it('turns on a flag when it is named', () => {
    expect(heard('there is a ranch slider')).toEqual({ slider: true });
  });
  it('reads spoken numbers', () => {
    expect(heard('height two and a half')).toEqual({ height: 2.5 });
    expect(heard('length twenty one point five')).toEqual({ length: 21.5 });
    expect(heard('stud 2.7')).toEqual({ height: 2.7 });
  });
  it('does not run a decimal into the count that follows it', () => {
    expect(heard('height two point four one door')).toEqual({ height: 2.4, doors: 1 });
    expect(heard('length three point six five')).toEqual({ length: 3.65 });
  });
  it('leaves out anything it did not hear a number for', () => {
    expect(heard('the height is quite tall')).toEqual({});
    expect(heard('')).toEqual({});
    expect(heard('length 4')).toEqual({ length: 4 });
  });
});
