# pj-kanbaniii

Componente Angular de exemplo para o Gerenciador de Fila de Impressão 3D.

O repositório contém um componente standalone em `src/app/app.component.ts` que:

- Converteu o template original para sintaxe Angular (`*ngIf`, `*ngFor`, `()`, `[]`).
- Ajusta o path da coleção Firestore (remove barra inicial que quebrava o `collection()`).
- Melhora validação do formulário e tratamento de mensagens.

Observações de integração:

1. Este repositório não é um projeto Angular completo. Para integrar o componente em um projeto Angular existente:
   - Copie `src/app/app.component.ts` para o diretório `src/app/` do seu projeto Angular.
   - Garanta que o projeto use Angular 16+ (para `signal`/`computed`) ou adapte o código para `BehaviorSubject`/`Observable` caso use versão anterior.
   - Adicione o script do Ionicons no `index.html` (ou outro mecanismo para carregar os ícones):

```html
<script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
<script nomodule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>
```

   - Se estiver usando validação AOT com componentes customizados, adicione `CUSTOM_ELEMENTS_SCHEMA` ao `NgModule` (ou configure em `bootstrapApplication`) para evitar erros de template relacionados a `ion-icon`.
   - Crie/atualize as credenciais Firebase no `firebaseConfig` ou mova para `environments/environment.ts`.

2. Para rodar localmente num projeto Angular padrão:

```bash
npm install
ng serve
```

Limitações e notas:

- O código utiliza a SDK modular do Firebase. Certifique-se de usar versões compatíveis.
- `createdAt` é escrito com `serverTimestamp()`; ao exibir no cliente usamos `pedido.createdAt?.toDate() | date:...` — caso receba `null` ou placeholder, o template mostra vazio.
- A política de autenticação (anon, email/senha) pode ser ajustada conforme a necessidade.

Próximos passos que posso executar (opcional):

- Integrar esse componente em um esqueleto Angular (criar `package.json`, `angular.json`, `src/main.ts`, etc.) para poder rodar aqui no container.
- Ajustar o componente para versões mais antigas do Angular (sem `signals`).

Se quiser que eu integre e rode um esqueleto Angular aqui, diga "Criar esqueleto".
# pj-kanbaniii