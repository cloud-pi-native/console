const sonarqubeToken = 'sonar-token'
const permission = 'sonar-permission'

export const createDefaultTemplate = async () => {
  await fetch('https://sonar-system-ingress.apps.ocp4-7.infocepo.com/web_api/api/permissions/create_template', {
    method: 'POST',
    body: {
      name: 'Mi-Forge Default',
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${sonarqubeToken}`,
    },
  })
  await fetch('https://sonar-system-ingress.apps.ocp4-7.infocepo.com/web_api/api/permissions/add_project_creator_to_template', {
    method: 'POST',
    body: {
      templateName: 'Mi-Forge Default',
      permission,
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${sonarqubeToken}`,
    },
  })
}

// - name: "Add creator to template"
//   uri:
//     url: "{{ SONAR_API_URL }}api/permissions/add_project_creator_to_template"
//     method: POST
//     user: "{{ SONAR_API_TOKEN }}"
//     password: ""
//     body_format: form-urlencoded
//     body:
//       templateName: "Mi-Forge Default"
//       permission: "{{ item }}"
//     force_basic_auth: yes
//     status_code: 204
//   with_items:
//     - "admin"
//     - "codeviewer"
//     - "issueadmin"
//     - "securityhotspotadmin"
//     - "scan"
//     - "user"

// - name: "Add admin group to template"
//   uri:
//     url: "{{ SONAR_API_URL }}api/permissions/add_group_to_template"
//     method: POST
//     user: "{{ SONAR_API_TOKEN }}"
//     password: ""
//     body_format: form-urlencoded
//     body:
//       groupName: "sonar-administrators"
//       templateName: "Mi-Forge Default"
//       permission: "{{ item }}"
//     force_basic_auth: yes
//     status_code: 204
//   with_items:
//     - "admin"
//     - "codeviewer"
//     - "issueadmin"
//     - "securityhotspotadmin"
//     - "scan"
//     - "user"

// - name: "Set Default Template"
//   uri:
//     url: "{{ SONAR_API_URL }}api/permissions/set_default_template"
//     method: POST
//     user: "{{ SONAR_API_TOKEN }}"
//     password: ""
//     body_format: form-urlencoded
//     body:
//       templateName: "Mi-Forge Default"
//     force_basic_auth: yes
//     status_code: 204
//   register: result
