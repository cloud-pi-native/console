# Show Actual Config Values + Reset-to-Default Button

> **For Hermes:** Use plan mode only for this turn. No code changes.

**Goal:** Make plugin config fields in the client show the current persisted value, and add a reset control that reverts an edited item back to the backend `initialValue`.

**Architecture:** Keep manifest editing minimal by deriving observable dirty/reset state from the existing plugin config payload instead of introducing a new store or API.

**Tech Stack:** Vue 3 (`apps/client`), Pinia, `@cpn-console/shared` types, DSFR components.

---

## Task 1: Normalize manifest values with actual + initial defaults

**Objective:** Ensure the backend manifest carries a stable visible value separate from the original default, using existing shared types only.

**Files:**
- Create: none
- Modify: none
- Test: validate with manifest payload shape observations

**Step 1: Find existing saved-value path**

Run:
```bash
rg -n "PluginsUpdateBody|pluginUpdateBody|projectServices|manifest" apps/server-nestjs/src/modules/project-services apps/client/src/components/ServicesConfig.vue packages/shared/src/schemas/config.ts
```
Expected: save path uses string values and no extra default tracking.

**Step 2: Validate current response contract**

Run:
```bash
rg -n "manifest: PluginConfig" apps/server-nestjs/src/modules/project-services/project-services.utils.ts apps/server-nestjs/src/modules/project-services/project-services.service.ts
```
Expected: confirm payload exposes `value` and `initialValue` fields as authored by plugins.

**Step 3: Confirm client wires only `value.ref()`**

Run:
```bash
sed -n '42,60p;186,205p;225,238p' apps/client/src/components/ServicesConfig.vue
```
Expected: only `item.value` is bound; `initialValue` is ignored.

---

## Task 2: Make `ConfigParam` value-aware and reset-capable

**Objective:** Update the config param component to display live current value and emit a reset action when asked.

**Files:**
- Modify: `apps/client/src/components/ConfigParam.vue`

**Step 1: Extend props to accept optional default**

Find/reserve current contract:
```bash
sed -n '1,40p' apps/client/src/components/ConfigParam.vue
```

Change:
```diff
   const props = defineProps<{
     options: {
       value: globalThis.Ref<string>
+      defaultValue: string | undefined
       description: string | undefined
       name: string
       disabled: boolean
       kind: 'text' | 'switch'
       placeholder: string | undefined
     }
   }>()
```

**Step 2: Track default and reset state**

Add:
```diff
 const value = ref(props.options.value)
+const defaultValue = computed(() => props.options.defaultValue)
 function set(data: string) {
   value.value = data
   emit('update', data)
 }
+function reset() {
+  value.value = defaultValue.value ?? ''
+  emit('update', defaultValue.value ?? '')
+}
```

**Step 3: Add reset button control**

Template change:
```diff
   <hr
     class="col-span-2 p-1"
-  >
+  >
+  <DsfrButton
+    v-if="defaultValue !== undefined && defaultValue !== value"
+    label="Réinitialiser"
+    secondary
+    size="sm"
+    class="mt-2"
+    data-testid="reset-config"
+    @click="reset"
+  />
 </template>
```

Fallback if `DsfrButton` rejects `size="sm"`:
```diff
-    size="sm"
```

**Step 4: Verify render path**

Run:
```bash
pnpm exec vitest run apps/client/src/components/ConfigParam.vue
```
Expected pass or skip if no spec exists; if fails, stop before patching `ServicesConfig`.

---

## Task 3: Pass actual value and reset target from services config

**Objective:** Preserve the shipped `value.ref()` while also sending the default required for the reset button.

**Files:**
- Modify: `apps/client/src/components/ServicesConfig.vue`

**Step 1: Add reset action on item**

Change:
```diff
   const updated = ref<PluginsUpdateBody>({})
 
   function update(data: { value: string, key: string, plugin: string }) {
     if (!updated.value[data.plugin]) updated.value[data.plugin] = {}
     updated.value[data.plugin][data.key] = data.value
   }
+  function reset(data: { key: string, plugin: string, defaultValue: string }) {
+    if (!updated.value[data.plugin]) updated.value[data.plugin] = {}
+    updated.value[data.plugin][data.key] = data.defaultValue
+  }
```

**Step 2: Pass `defaultValue` into each `ConfigParam`**

Change both project and global `ConfigParam` usages:

```diff
                       <ConfigParam
                         v-for="item in items"
                         :key="item.key"
                         :options="{
                           value: ref(item.value),
+                          defaultValue: item.initialValue,
                           kind: item.kind,
                           description: item.description,
                           name: item.title,
                           // @ts-ignore
                           placeholder: item.placeholder || '',
                           disabled: !item.permissions[permissionTarget].write || props.disabled,
                         }"
-                        @update="(value: string) => update({ key: item.key, value, plugin: service.name })"
+                        @update="(value: string) => update({ key: item.key, value, plugin: service.name })"
+                        @reset="(value: string) => reset({ key: item.key, value, plugin: service.name, defaultValue: value })"
                       />
```

Repeat identical patch for the global block.

**Step 3: Update save flow to omit defaults**

Change:
```diff
   async function save() {
+    const sanitized: PluginsUpdateBody = {}
+    for (const [plugin, values] of Object.entries(updated.value)) {
+      const entries = Object.entries(values).filter(([_, current]) => {
+        const item = findInitial(service.name, _)
+        return current !== item.initialValue
+      })
+      if (entries.length) sanitized[plugin] = Object.fromEntries(entries)
+    }
+    if (!Object.keys(sanitized).length) {
+      snackbarStore.setMessage('Aucune modification à enregistrer', 'info')
+      await reload()
+      updated.value = {}
+      return
+    }
     try {
-      await props.project.Services.update(updated.value)
+      await props.project.Services.update(sanitized)
       snackbarStore.setMessage('Paramètres sauvegardés', 'success')
     } catch {
       snackbarStore.setMessage('Erreur lors de la sauvegarde', 'error')
     }
     await reload()
     updated.value = {}
   }
```

Add helper:
```diff
+function findInitial(pluginName: string, key: string): PluginConfigItem & { value: any } {
+  const all = [
+    ...(servicesWithRef.value.find(s => s.name === pluginName)?.manifest.project ?? []),
+    ...(servicesWithRef.value.find(s => s.name === pluginName)?.manifest.global ?? []),
+  ] as (PluginConfigItem & { value: any })[]
+  return all.find(i => i.key === key) as PluginConfigItem & { value: any }
+}
```

**Step 4: Wire button visibility only when write allowed**

The existing `disabled` prop already restricts writes; reset should be hidden when `!write`.

Update reset button render:
```diff
                       <ConfigParam
                         ...
                         :disabled="!item.permissions[permissionTarget].write || props.disabled"
-                        @reset="..."
                       />
+                      <DsfrButton
+                        v-if="item.permissions[permissionTarget].write && !props.disabled"
+                        label="Réinitialiser"
+                        secondary
+                        size="sm"
+                        class="mt-2"
+                        data-testid="reset-config"
+                        @click="reset({ key: item.key, value: item.value, plugin: service.name, defaultValue: item.initialValue })"
+                      />
```

**Step 5: Verify**

Run:
```bash
pnpm exec vitest run apps/client/src/components/ServicesConfig.vue
```
Expected: existing behaviors preserved; no exported type changes.

---

## Task 4: Surface reset feedback and preserve dirty accounting

**Objective:** Make UI state consistent when reset occurs without leaving stale updated markers hidden from save.

**Files:**
- Modify: `apps/client/src/components/ServicesConfig.vue`

**Step 1: Handle reset in dirty accounting**

Change:
```diff
   function reset(data: { key: string, plugin: string, defaultValue: string }) {
     if (!updated.value[data.plugin]) updated.value[data.plugin] = {}
-    updated.value[data.plugin][data.key] = data.defaultValue
+    const item = findInitial(data.plugin, data.key)
+    if (data.defaultValue === item?.initialValue) {
+      delete updated.value[data.plugin][data.key]
+      if (!Object.keys(updated.value[data.plugin]).length) delete updated.value[data.plugin]
+    } else {
+      updated.value[data.plugin][data.key] = data.defaultValue
+    }
   }
```

**Step 2: Show snackbar on reset only**

Use:
```bash
sed -n '1,12p' apps/client/src/components/ServicesConfig.vue
```
Add after `snackbarStore` import:
```diff
 const snackbarStore = useSnackbarStore()
+function resetItem(data: { key: string, plugin: string, defaultValue: string }) {
+  reset(data)
+  snackbarStore.setMessage('Paramètre réinitialisé', 'info')
+}
```

Replace `@click="reset(...)"` with `@click="resetItem(...)"`.

**Step 3: Final test pass**

Run:
```bash
pnpm -w exec vitest run apps/client/src/components/ServicesConfig.vue apps/client/src/components/ConfigParam.vue apps/client/src/stores/system-settings.spec.ts
```
Expected: 0 new failures, no type compile break under `tsc --noEmit`.

---

## Task 5: Validate manifests actually expose saved values today

**Objective:** Confirm the shipped manifests use both `value` and `initialValue`, otherwise the reset target is unreliable client-side.

**Files:**
- Create: none
- Modify: none
- Test: none

**Step 1: Grep plugin `infos.ts` files**

Run:
```bash
rg -n "initialValue" plugins/*/src/infos.ts
```
Expected: limited to 9-10 plugins; if authoring misses `initialValue`, note gap in plan.

**Step 2: Inspect populated manifest payload**

Run:
```bash
rg -n "populateServiceManifest|manifest.project|manifest.global" apps/server-nestjs/src/modules/project-services -g'*.ts'
```
Expected: confirm payload keeps author-supplied `value` instead of scrubbing defaults.

If missing, add fallback default derivation only in `apps/server-nestjs/src/modules/project-services/project-services.utils.ts`:
```ts
const defaultValue = item.initialValue ?? item.value
```

---

## Files likely to change

- `apps/client/src/components/ConfigParam.vue`
- `apps/client/src/components/ServicesConfig.vue`

## Tests / validation

```bash
pnpm -w exec vitest run apps/client/src/components/ServicesConfig.vue apps/client/src/components/ConfigParam.vue apps/client/src/stores/system-settings.spec.ts
pnpm -w exec tsc --noEmit
```

## Risks, tradeoffs, and open questions

- Risk: plugin authors do not populate `initialValue`; reset would fall back to current value.
  - Mitigation: backend fallback from existing field or manifest inspection in Task 5.
- Risk: dual reset buttons in project/global sections can clutter dense callsets.
  - Tradeoff: keep local reset per field; global panel reset can be added later if needed.
- Risk: reset payload may bypass permissions if wired awkwardly.
  - Mitigation: guard all buttons with same `permissionTarget.write` check used for inputs.

**Open question:** Should the reset button be shown only when the current value differs from the displayed input, instead of always?

---

Plan saved to `.hermes/plans/2026-07-21_000000-client-config-default-reset.md`.
