// Keep keyboard focus within the active native dialog, including browser edge cases.
export function trapDialogFocus(event:KeyboardEvent){
 const dialog=event.currentTarget as HTMLDialogElement;
 if(event.key!=='Tab'||!dialog.open||(event.target as HTMLElement).closest('dialog')!==dialog)return;
 const nodes=[...dialog.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex]')].filter(node=>!node.matches(':disabled')&&node.tabIndex>=0&&node.getClientRects().length>0);
 const first=nodes[0],last=nodes.at(-1);if(!first||!last){event.preventDefault();dialog.focus();return}
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
}
