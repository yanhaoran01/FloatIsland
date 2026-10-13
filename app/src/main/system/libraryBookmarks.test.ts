/* FloatIsland contributors. GPL-3.0. */
/** @file libraryBookmarks.test.ts @description Bookmark exports preserve Chinese metadata and safe literal values. */
import {describe,it,expect} from 'vitest';
import {importBookmarkHtml,exportBookmarkHtml} from './libraryBookmarks';
import {LibraryStore} from './libraryStore';
describe('bookmark interchange',()=>{
 it('round-trips groups, tags, notes, pins and URLs without duplicates',()=>{const store=new LibraryStore('unused-fixture-path');store.write({type:'url',url:'https://example.com/?q=中文#part',title:'<Research>',group:'资料',tags:['one,two','标签'],note:'A & B\nC'});store.data.items[0].pinned=true;const html=exportBookmarkHtml(store.snapshot().items),rows=importBookmarkHtml(html),other=new LibraryStore('unused-fixture-path');other.migrate(rows);other.migrate(rows);expect(other.data.items).toHaveLength(1);expect(other.data.items[0]).toMatchObject({title:'<Research>',group:'资料',tags:['one,two','标签'],note:'A & B\nC',pinned:true,url:store.data.items[0].url});expect(html).not.toContain('><Research>');});
 it('reads ordinary nested browser folders and notes',()=>{const rows=importBookmarkHtml('<DL><DT><H3>Work</H3><DL><DT><H3>Docs</H3><DL><DT><A HREF="https://example.com" TAGS="a,b">Example</A></DT><DD>Keep this</DD></DL></DT></DL></DT></DL>');expect(rows[0]).toMatchObject({folder:'Work / Docs',note:'Keep this',tags:['a','b']});});
});
