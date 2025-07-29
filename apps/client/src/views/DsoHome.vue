<script lang="ts" setup>
import { type Ref, ref } from 'vue'
import { contactEmail } from '@/utils/env'

interface TabTitle {
  title: string
  icon: string
}

interface MailType {
  to: string
  label: string
  address: string
}

interface KnowMoreBtn {
  label: string
  title: string
  onClick: any
}

const initialSelectedIndex = 0

const selectedTabIndex = ref(initialSelectedIndex)

const tabListName: string = 'benefitsTab'
const tabTitles: Array<TabTitle> = [
  {
    title: 'Qualité',
    icon: 'ri:award-line',
  },
  {
    title: 'Déploiement continu',
    icon: 'ri:git-merge-line',
  },
  {
    title: 'Sécurité',
    icon: 'ri:shield-check-line',
  },
]
const tabContents: Array<string> = [
  'Avec la mise en place progressive d\'une véritable usine logicielle DevSecOps ("DSO" pour "développement, sécurité et exploitation") soutenant l\'agilité pour concevoir des applications sécurisées et de qualité à partir du socle OpenShift, le ministère de l\'Intérieur se dote d\'une offre clé en main, fonctionnelle et technique, qui permet de produire et opérer des services numériques de haute qualité, sécurisés et ergonomiques qui répondent aux besoins des citoyens et des agents, tout en restant évolutifs et maintenables à moindre coût.',
  'Temps de déploiement < 2 heures pour une application existante, sans impact utilisateur ; < 15 minutes pour un environnement usine et < 5 jours pour le déploiement en autonomie d\'une nouvelle application d\'un langage « top3 », après demande initiale sur la console Cloud Native (incluant signature du conventionnement dématérialisé.',
  'L\'offre Cloud π Native permet d\'héberger des données sensibles jusqu\'au niveau Diffusion Restreinte (DR) en conformité avec le SecNumCloud. Elle intègre les règles de durcissement de Kubernetes en vigueur et la conformité à l\'état de l\'art (cf. SecNumCloud et guide NSA/CISA).',
]

const mail: MailType = {
  to: `mailto:${contactEmail}?subject=Question à propos de Cloud π Native`,
  label: `Nous écrire (${contactEmail})`,
  address: contactEmail,
}
const ghFormationUrl: string = 'https://github.com/cloud-pi-native/embarquement-autoformation'

const knowMoreBtn: Ref<KnowMoreBtn> = ref({
  label: 'Contactez-nous pour en savoir plus',
  title: mail.address,
  onClick: () => setWindowLocation(mail.to),
})

function setWindowLocation(to: string) {
  // TODO
  // @ts-ignore
  window.location = to
}
</script>

<template>
  <h1
    id="top"
    class="fr-h1 fr-text-title--blue-france text-center"
  >
    Cloud π Native
  </h1>

  <section
    class="fr-py-2w flex flex-col"
  >
    <DsfrCallout
      title="Description de l'offre Cloud π Native"
      content="L'offre à visée interministérielle Cloud π Native s'appuie sur l'écosystème de ressources Cloud π du Ministère de l'Intérieur et des Outre-mer. Elle propose en outre une usine logicielle et un orchestrateur DevSecOps permettant de produire et opérer des services numériques de qualité au service des usagers (y compris celles et ceux qui produisent le numérique public)."
    />
    <DsfrTabs
      v-model="selectedTabIndex"
      :tab-list-name="tabListName"
      :tab-titles="tabTitles"
      :tab-contents="tabContents"
      class="md:(h-full mt-0 pt-0)"
    >
      <DsfrTabContent
        v-for="i in tabContents.length"
        :key="i"
        panel-id="general"
        tab-id="general"
      >
        {{ tabContents[i] }}
      </DsfrTabContent>
    </DsfrTabs>
  </section>

  <hr class="section-separator">

  <section>
    <h2
      id="personas"
      class="fr-h2 fr-text-title--blue-france text-center"
    >
      À qui s'adresse l'offre Cloud π Native ?
    </h2>
    <div
      class="grid grid-cols-3 gap-10 <md:flex <md:flex-col mb-2"
    >
      <div
        class="tile-button"
      >
        <DsfrTile
          class="fr-mb-2w"
          title="Agents ministériels"
          description="Acteur de la transformation numérique sur un secteur ministériel ou interministériel ? A terme, l'offre Cloud π Native sera consommable avec le maximum d'autonomie depuis le réseau interministériel d'Etat via le catalogue de services. Pour l'heure, elle est en co-construction en agilité avec ses partenaires-clients et le code du socle est disponible en open-source."
          :to="ghFormationUrl"
        />
        <DsfrButton
          label="Rejoignez la communauté"
          class="w-full justify-center"
          secondary
          :title="ghFormationUrl"
          icon="ri:github-line"
          @click="setWindowLocation(ghFormationUrl)"
        />
      </div>
      <div
        class="tile-button"
      >
        <DsfrTile
          class="fr-mb-2w"
          title="Acteurs industriels, SSII/ESN, contributeurs open source... et curieux"
          description="Industriel, freelance ou contributeur Open Source vous souhaitez vous faire une idée ? l'offre est mise à disposition en open source pour favoriser l'appropriation des technologies « Cloud Native » et l'émergence de standards du numérique public plus interopérables avec la production industrielle, dans le respect des valeurs du service public."
        />
        <DsfrButton
          label="Contactez-nous"
          class="w-full justify-center"
          secondary
          :title="mail.address"
          icon="ri:mail-line"
          @click="setWindowLocation(mail.to)"
        />
      </div>
      <div
        class="tile-button"
      >
        <DsfrTile
          class="fr-mb-2w"
          title="Initiatives partenariales"
          description="Acteur du service public, industriel ou contributeur de l'Open Source, vous contribuez au numérique public et souhaitez expérimenter l'offre ? Faites-nous part de propositions/demandes d'expérimentation. Nos équipes accompagnent les expérimentations à but non-lucratif : elles n'examineront et ne répondront à AUCUNE sollicitation commerciale."
        />
        <DsfrButton
          label="Contactez-nous"
          class="w-full justify-center"
          secondary
          :title="mail.address"
          icon="ri:mail-line"
          @click="setWindowLocation(mail.to)"
        />
      </div>
    </div>
  </section>

  <hr class="section-separator">

  <section>
    <h2
      id="consommation"
      class="fr-h2 fr-text-title--blue-france text-center"
    >
      Comment consommer Cloud π Native ?
    </h2>
    <DsfrCallout
      title="Une offre en co-construction"
      :content="`L'offre Cloud π native est actuellement en co-construction en agilité, avec nos partenaires clients, le soutien financier du plan de relance et l'appui de la DINUM. Afin de vous accompagner dans son expérimentation et sa construction, nous vous invitons à prendre contact avec nos équipes via l'adresse ${contactEmail}.`"
      :button="knowMoreBtn"
    />
  </section>
</template>
