import {PALETTES} from '../shared/design-tokens.js';
const KEY='xiaoshidi.ui.v1';
export function normalizePreferences(raw){return {theme:PALETTES.some(p=>p.id===raw?.theme)?raw.theme:'blue',collapsed:raw?.collapsed===true,hideEmpty:raw?.hideEmpty!==false};}
export function readPreferences(){try{return normalizePreferences(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{return normalizePreferences({});}}
export function writePreferences(p){try{localStorage.setItem(KEY,JSON.stringify(normalizePreferences(p)));return true;}catch{return false;}}
export function applyPreferences(p){const prefs=normalizePreferences(p),colors=PALETTES.find(c=>c.id===prefs.theme),root=document.documentElement;root.dataset.theme=colors.id;root.dataset.navCollapsed=String(prefs.collapsed);for(const [key,value]of Object.entries(colors))if(!['id','name'].includes(key))root.style.setProperty('--accent'+(key==='accent'?'':'-'+key),value);}
