/* FloatIsland contributors. GPL-3.0. */
/** @file libraryUtils.test.ts @description Template variables use local time and literal values, never scripts. */
import {describe,expect,it} from 'vitest';
import {expandTemplate,templateVariables} from './libraryUtils';
describe('explicit template expansion',()=>{
 it('deduplicates named fields and excludes date/time builtins',()=>expect(templateVariables('{{date}} {{name}} {{姓名}} {{name}} {{time}}')).toEqual(['name','姓名']));
 it('keeps unknown fields and expands local time literally',()=>expect(expandTemplate('{{date}} {{time}} {{name}} {{unknown}}',{name:'$& <script>'},new Date(2026,9,10,8,9,7))).toBe('2026-10-10 08:09:07 $& <script> {{unknown}}'));
});
