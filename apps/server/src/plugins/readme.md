# Plugins modèles

## Entries

```js
{ 
  // args come from controllers
  args: {
    projectName: 'toto',
    orgName: 'titi',
  },
  failed: true || undefined
  /*
  [pluginName]: <PluginResult>
  [pluginName]: <PluginResult>
  ...
  */
}
```

## Result

Note: Si un module réutilise son propre payload, il doit penser à renvoyer le précédent s'il ne veut pas l'écraser. Charge aussi au plugin de gérer les erreurs des étapes précédentes.
```js
{
  status: {
    result: string('KO' || 'OK'),
    message: string(),
  },
  vault: [
    {
      name: string(),
      data: {
        // secret data
      }
    }
  ] || undefined
  // otherKey: {},
  // anotherKey: {},
}
```