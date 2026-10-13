<script setup lang="ts">
import {ref,nextTick} from 'vue';
import {useI18n} from 'vue-i18n';
const root=ref<HTMLElement>();
const props=defineProps<{modelValue:any;disabled:boolean}>();
const emit=defineEmits(['update:modelValue']);
const {t,locale}=useI18n();
function change(path:(string|number)[],value:any){const next=structuredClone(JSON.parse(JSON.stringify(props.modelValue)));let target=next;for(const key of path.slice(0,-1))target=target[key];target[path.at(-1)!]=value;emit('update:modelValue',next)}
async function add(){const next=JSON.parse(JSON.stringify(props.modelValue));next.items.push({name:{lv:'',ru:'',en:''},price:'',display_order:Math.max(next.items.length,...next.items.map((r:any,i:number)=>r.display_order??i))+1,archived:false});emit('update:modelValue',next);await nextTick();const last=root.value?.querySelector('details:last-of-type');last?.setAttribute('open','');(last?.querySelector('textarea') as HTMLElement)?.focus()}
</script>
<template>
<fieldset ref="root" class="price-editor" :disabled="disabled">
 <legend>{{t('operations.priceRows')}}</legend>
 <button type="button" :disabled="modelValue.items.length>=300" @click="add">{{t('operations.addRow')}}</button>
 <p>{{t('operations.rowHelp')}}</p>
 <label v-for="lang in ['lv','ru','en']" :key="lang">{{t('operations.category')}} · {{lang.toUpperCase()}}<input :value="modelValue.title[lang]" required maxlength="2000" @input="change(['title',lang],($event.target as HTMLInputElement).value)"/></label>
 <details v-for="(row,index) in modelValue.items" :key="index">
  <summary>{{Number(index)+1}} · {{row.name[locale]||t('operations.newRow')}} <span v-if="row.archived">({{t('operations.archived')}})</span></summary>
  <label v-for="lang in ['lv','ru','en']" :key="lang">{{t('operations.name')}} · {{lang.toUpperCase()}}<textarea :value="row.name[lang]" required maxlength="2000" @input="change(['items',index,'name',lang],($event.target as HTMLTextAreaElement).value)"/></label>
  <label>{{t('operations.price')}}<input :value="row.price" required pattern="[0-9]{1,7}(\.[0-9]{1,2})?(/[0-9]{1,7}(\.[0-9]{1,2})?)*" @input="change(['items',index,'price'],($event.target as HTMLInputElement).value)"/></label>
  <label>{{t('operations.order')}}<input :value="row.display_order??Number(index)" type="number" min="-1000000" max="1000000" required @input="change(['items',index,'display_order'],Number(($event.target as HTMLInputElement).value))"/></label>
  <label><input type="checkbox" :checked="row.archived" @change="change(['items',index,'archived'],($event.target as HTMLInputElement).checked)"/>{{t('operations.archived')}}</label>
 </details>

</fieldset>
</template>
<style scoped>
.price-editor{border:0;padding:0;min-width:0}.price-editor label{display:block;margin:16px 0}.price-editor input:not([type=checkbox]),.price-editor textarea{display:block;min-height:44px;width:100%;font:inherit;border:1px solid var(--line);padding:10px;background:var(--white);color:var(--ink)}.price-editor details{border-top:1px solid var(--line);padding:12px 0}.price-editor summary{cursor:pointer;min-height:44px;padding:10px 0}.price-editor button{font:inherit;min-height:44px;padding:10px;border:1px solid var(--line)}.price-editor :focus-visible{outline:2px solid var(--ink);outline-offset:3px}
</style>
