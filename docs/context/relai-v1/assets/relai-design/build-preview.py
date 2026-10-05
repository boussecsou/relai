from pathlib import Path
import json,base64,re
root=Path(__file__).parent
icons=json.loads((root/'app-icons.json').read_text())
fonts="@font-face{font-family:'IBM Plex Sans';src:url(data:font/ttf;base64,"+base64.b64encode((root/'fonts/IBMPlexSans.ttf').read_bytes()).decode()+") format('truetype');font-style:normal;font-weight:400;font-display:swap}@font-face{font-family:'IBM Plex Mono';src:url(data:font/woff2;base64,"+base64.b64encode((root/'fonts/IBMPlexMono-Regular.woff2').read_bytes()).decode()+") format('woff2');font-style:normal;font-weight:400;font-display:swap}"
css=(root/'app.css').read_text()+'\n'+(root/'runtime.css').read_text()+"\n.sidebar-hidden .layout{grid-template-columns:minmax(0,1fr) 44px}.sidebar-hidden aside{display:none}@media(max-width:720px){#mobile-mailbox{display:inline-flex!important;font-size:10px;padding:5px 7px}.sidebar-hidden .layout{grid-template-columns:minmax(0,1fr)}.header-actions [data-action=help]{display:none}}"
html=(root/'app-shell.html').read_text()
html=re.sub(r'<!-- ICON:([a-z0-9-]+) -->',lambda m:icons.get(m[1],icons['circle-help']),html)
licenses='\nLucide icons\n'+(root/'icons/LICENSE').read_text()+'\nMarked Markdown renderer\n'+(root/'vendor/marked-LICENSE.md').read_text()+'\nIBM Plex fonts\n'+(root/'fonts/IBM-Plex-OFL.txt').read_text()
html=html.replace('<!-- LICENSES -->','<!-- '+licenses.replace('--','—')+' -->').replace('<!-- STYLES -->','<style>'+fonts+css+'</style>')
html=html.replace('<!-- SCRIPTS -->','<script>'+ (root/'vendor/marked.umd.js').read_text().replace('</script','<\\/script')+'\nconst iconLibrary='+json.dumps(icons)+';\nconst uxNotesMarkdown='+json.dumps((root/'DESIGN-NOTES.md').read_text())+';\n'+(root/'runtime.js').read_text()+'\n'+(root/'app.js').read_text()+'</script>')
(root/'index.html').write_text(html)
print('Built self-contained index.html:',len(html),'characters')
