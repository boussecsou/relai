function uiIcon(name){return iconLibrary[name]||iconLibrary['circle-help']}
function iconOnly(element,name){if(element)element.innerHTML=uiIcon(name)}
function refreshIcons(root){
const labels={'Menu':'menu','Help':'circle-help','Settings':'settings','Refresh':'refresh-cw','More options':'ellipsis','Previous page':'chevron-left','Next page':'chevron-right','Back':'arrow-left','Calendar':'calendar-days','Notes':'notebook','Tasks':'square-check','Add tool':'plus','Close':'x','Close composer':'x','Close Git context':'x','Previous message':'arrow-up','Next message':'arrow-down','Copy Markdown':'copy','Bullet list':'list','Inline code':'code','Heading':'heading'};
root.querySelectorAll('button[aria-label]').forEach(button=>{const label=button.getAttribute('aria-label');if(labels[label])iconOnly(button,labels[label]);if(label==='Star')iconOnly(button,'star');if(label==='Collapse message')iconOnly(button,'chevron-up');if(label==='Expand message')iconOnly(button,'chevron-down')});
root.querySelectorAll('.compose,.mobile-compose').forEach(button=>button.innerHTML=uiIcon('pencil')+'<span>Compose prompt</span>');
root.querySelectorAll('.send').forEach(button=>button.innerHTML='<span>Send prompt</span>'+uiIcon('arrow-up-right'));
const navIcons={Inbox:'inbox',Starred:'star',Pending:'clock',Sent:'send',Drafts:'file-text',Sessions:'messages-square'};root.querySelectorAll('[data-box]').forEach(button=>iconOnly(button.querySelector('.symbol'),navIcons[button.dataset.box]));
root.querySelectorAll('.tab[data-filter]').forEach(button=>{const text=button.dataset.filter==='all'?'All conversations':button.dataset.filter==='attention'?'Needs review':'Completed';button.innerHTML=uiIcon(button.dataset.filter==='all'?'inbox':button.dataset.filter==='attention'?'circle-help':'check')+`<span>${text}</span>`+(button.dataset.filter==='attention'?'<span class="badge">2 new</span>':'')});
root.querySelectorAll('.repo-tag').forEach(tag=>{const text=tag.textContent.replace('▱','').trim();tag.innerHTML=uiIcon('folder')+esc(text)});
const search=root.querySelector('.search');if(search){search.firstElementChild.outerHTML=uiIcon('search');if(search.lastElementChild.tagName!=='INPUT')search.lastElementChild.outerHTML=uiIcon('sliders-horizontal')}
const conversationSearch=root.querySelector('.conversation-search');if(conversationSearch)conversationSearch.firstElementChild.outerHTML=uiIcon('search');
root.querySelectorAll('.context-path').forEach(el=>{const text=el.textContent.replace('▱','').trim();el.innerHTML=uiIcon('folder')+esc(text)});
const branch=root.querySelector('#git-branch');if(branch)branch.innerHTML=uiIcon('git-branch')+'feature/navigation';
root.querySelectorAll('.format-group [data-format="list"]').forEach(button=>iconOnly(button,'list'));root.querySelectorAll('.format-group [data-format="code"]').forEach(button=>iconOnly(button,'code'));root.querySelectorAll('.format-group [data-format="heading"]').forEach(button=>iconOnly(button,'heading'));
root.querySelectorAll('.collapse-message').forEach(button=>{iconOnly(button,button.getAttribute('aria-expanded')==='false'?'chevron-down':'chevron-up');if(!button.dataset.iconObserver){new MutationObserver(()=>iconOnly(button,button.getAttribute('aria-expanded')==='false'?'chevron-down':'chevron-up')).observe(button,{attributes:true,attributeFilter:['aria-expanded']});button.dataset.iconObserver='true'}});
}
