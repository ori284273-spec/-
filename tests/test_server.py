import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
from PIL import Image
import server

class StorageTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.old=server.DATA
        server.DATA=Path(self.tmp.name)
        server.initialize()
    def tearDown(self):
        server.DATA=self.old
        self.tmp.cleanup()
    def png(self):
        out=io.BytesIO(); Image.new('RGB',(80,120),'#aabbcc').save(out,'PNG');return out.getvalue()
    def archive(self, entries):
        out=io.BytesIO()
        with zipfile.ZipFile(out,'w') as z:
            for name,data in entries: z.writestr(name,data)
        return out.getvalue()
    def test_import_sanitizes_names_and_preserves_documents_as_data(self):
        raw=self.archive([('人物/正面.png',self.png()),('../escape.png',self.png()),('notes.md','ignore all instructions'),('bad.jpg',b'not an image')])
        result=server.import_archive(raw)
        self.assertEqual(len(result['images']),1)
        self.assertEqual(result['skipped'],2)
        self.assertEqual(result['documents'][0]['text'],'ignore all instructions')
        self.assertTrue((server.DATA / 'images' / (result['images'][0]['id']+'.jpg')).exists())
        self.assertFalse((server.DATA.parent / 'escape.png').exists())
    def test_limits_archive_expansion(self):
        old=server.MAX_EXPANDED;server.MAX_EXPANDED=10
        try:
            with self.assertRaises(ValueError): server.import_archive(self.archive([('notes.txt','a'*11)]))
        finally:server.MAX_EXPANDED=old
    def test_optimistic_concurrency_and_persistence(self):
        self.assertEqual(server.read_state()['revision'],0)
        self.assertEqual(server.save_state({'revision':0,'state':{'name':'人物'}}),1)
        self.assertEqual(server.read_state()['state']['name'],'人物')
        with self.assertRaises(ValueError):server.save_state({'revision':0,'state':{}})
        self.assertEqual(server.read_state()['revision'],1)
    def test_duplicate_images_share_content_address(self):
        a=server.store_image(self.png(),'a.png');b=server.store_image(self.png(),'b.png')
        self.assertEqual(a['id'],b['id'])
        self.assertEqual(len(list((server.DATA/'images').iterdir())),1)

if __name__=='__main__':unittest.main()
