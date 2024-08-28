# Plugins

## Lexique

Un plugin `core` est un service de base associé à la chaîne DSO.
Un plugin `external` est un service supplémentaire facultatif.
Un `hook` est un point de déclenchement dont le cycle de vie comprend plusieurs étapes (`step`) : `pre`, `main`, `post`, etc.
Tout `plugin` peut s'enregistrer sur un `hook`, à une étape donnée.

## Principe

Exemple :

1. Le plugin `gitlab` s'enregistre sur le hook `createProject`, à l'étape `main`.
2. Le controller `createProjectController` déclenche le hook `createProject` en lui associant un `payload`.
3. Le plugin `gitlab` réagit au déclenchement du hook `createProject` et reçoit le payload associé du controller.
4. Le plugin `gitlab` effectue ses opérations (ex: création d'un groupe GitLab pour le projet).
5. Le plugin `gitlab` renvoie un objet `result` au controller `createProjectController`, contenant un `status` indiquant si tout s'est déroulé sans erreur ou non.
6. Le controller `createProjectController` enregistre ce `result` en base de donnée et s'arrête si le `status` est en erreur.

## Modèles

### Entries

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

### Result

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
