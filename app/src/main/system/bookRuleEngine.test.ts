/* FloatIsland contributors. GPL-3.0. */
import {describe,it,expect} from 'vitest';
import {bookRule,unsupportedBookRule} from './bookRuleEngine';
describe('isolated book rules',()=>{
 it('extracts element lists and readable text with CSS/default attributes',async()=>{const list=await bookRule('<div class="book"><a href="/chapter">章节一</a></div>','class.book',true);expect(list).toHaveLength(1);expect(await bookRule(list[0],'a@href')).toEqual(['/chapter']);expect(await bookRule(list[0],'a@text')).toEqual(['章节一']);});
 it('supports JSONPath, XPath and regex transformations',async()=>{expect(await bookRule('{"books":[{"title":"A"}]}','$.books[*].title')).toEqual(['A']);expect(await bookRule('<root><name>A</name></root>','@XPath://name/text()')).toEqual(['A']);expect(await bookRule('a1 a2',':a(\\d)')).toEqual(['1','2']);expect(await bookRule('<p>A remove</p>','p@text## remove##')).toEqual(['A']);});
 it('executes pure JS without exposing Node or application APIs',async()=>{expect(await bookRule('hello','@js:result.toUpperCase()')).toEqual(['HELLO']);expect(await bookRule('hello','@js:typeof process+":"+typeof require')).toEqual(['undefined:undefined']);await expect(bookRule('','@js:while(true){}')).rejects.toThrow();});
 it('identifies unsupported native helpers before enabling the source',()=>{expect(unsupportedBookRule({ruleContent:'@js:java.ajax(url)'})).toBeTruthy();expect(unsupportedBookRule({ruleContent:'p@text'})).toBeUndefined();});
});
