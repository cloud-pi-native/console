{{/*
Expand the name of the chart.
*/}}
{{- define "dso_console_utils.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "dso_console_utils.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "dso_console_utils_utils.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "dso_console_utils.labels" -}}
helm.sh/chart: {{ include "dso_console_utils.chart" . }}
{{ include "dso_console_utils.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "dso_console_utils.selectorLabels" -}}
app.kubernetes.io/name: {{ include "dso_console_utils.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "dso_console_utils.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "dso_console_utils.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "set namespace" -}}
{{- if .Values.namespace -}}
  namespace: {{ .Values.namespace }}
{{- end -}}
{{- end -}}

{{- define "imagePullSecret" }}
{{- with .Values.imageCredentials }}
{{- printf "{\"auths\":{\"%s\":{\"username\":\"%s\",\"password\":\"%s\",\"email\":\"%s\",\"auth\":\"%s\"}}}" .registry .username .password .email (printf "%s:%s" .username .password | b64enc) | b64enc }}
{{- end }}
{{- end }}

{{- define "prefix" -}}
{{- if $.Release.Name -}}
{{- $.Release.Name -}}
{{- end -}}
{{ . }}
{{- end -}}

{{- define "globalEnv" -}}
{{- range $key, $val := .globalEnv }}
{{ $key }}: {{ $val | quote -}}
{{ end -}}
{{ end -}}

{{- define "containerEnv" -}}
{{ range $key, $val := .env }}
{{ $key }}: {{ $val | quote -}}
{{ end -}}
{{ end -}}
