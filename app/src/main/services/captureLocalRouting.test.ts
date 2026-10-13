/* FloatIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file captureLocalRouting.test.ts @description Logged-out screenshot routing and cloud opt-in boundaries. @author 鸡哥 */
import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({engine:vi.fn(),ocr:vi.fn(),translate:vi.fn(),fetch:vi.fn()}));
vi.mock('electron',()=>({app:{getVersion:()=> '1.3.0'},nativeImage:{}}));
vi.mock('./captureEngine',()=>({captureEngine:mocks.engine}));
vi.mock('./localCaptureOcr',()=>({recognizeLocalCapture:mocks.ocr}));
vi.mock('./textTranslationService',()=>({translateText:mocks.translate}));
import {recognizeCaptureText} from './captureOcrService';
import {translateCaptureImage} from './imageTranslationService';
beforeEach(()=>{vi.stubGlobal('fetch',mocks.fetch);mocks.engine.mockReturnValue('local');mocks.ocr.mockResolvedValue({success:true,text:'Hello world'});mocks.translate.mockResolvedValue({targetText:'你好，世界'});});
describe('local screenshot services',()=>{
  it('recognizes without a token or an image upload',async()=>{
    const signal=new AbortController().signal;expect(await recognizeCaptureText('','data:image/png;base64,AA==',signal)).toEqual({success:true,text:'Hello world'});
    expect(mocks.ocr).toHaveBeenCalledWith('data:image/png;base64,AA==',signal);expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('translates recognized text for a logged-out user without sending the image',async()=>{
    const result=await translateCaptureImage('','data:image/png;base64,AA==','auto','zh',new AbortController().signal);
    expect(result).toEqual({success:true,translatedText:'你好，世界'});expect(mocks.translate).toHaveBeenCalledWith('Hello world','en','zh',expect.any(AbortSignal));expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('does not submit an empty OCR result to the translation service',async()=>{
    mocks.ocr.mockResolvedValue({success:true,text:' '});expect(await translateCaptureImage('','data:image/png;base64,AA==','auto','zh',new AbortController().signal)).toMatchObject({success:false,code:'noTextFound'});expect(mocks.translate).not.toHaveBeenCalled();
  });
  it('reports OCR cancellation without replacing it with a login error',async()=>{
    mocks.ocr.mockResolvedValue({success:false,code:'ocrTimeout'});expect(await translateCaptureImage('','data:image/png;base64,AA==','en','zh',new AbortController().signal)).toMatchObject({success:false,code:'ocrTimeout'});
  });
  it('keeps authentication required for explicitly selected cloud services',async()=>{
    mocks.engine.mockReturnValue('server');const signal=new AbortController().signal;
    expect(await recognizeCaptureText('','data:image/png;base64,AA==',signal)).toMatchObject({success:false,code:'ocrLoginRequired'});
    expect(await translateCaptureImage('','data:image/png;base64,AA==','en','zh',signal)).toMatchObject({success:false,code:'loginRequired'});
    expect(mocks.ocr).not.toHaveBeenCalled();expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('keeps actual translation quota failures visible',async()=>{
    mocks.translate.mockRejectedValue(Error('translation-quota-or-service'));expect(await translateCaptureImage('','data:image/png;base64,AA==','en','zh',new AbortController().signal)).toMatchObject({success:false,code:'translationFailed',message:'Error: translation-quota-or-service'});
  });
});
