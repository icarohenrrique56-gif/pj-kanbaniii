import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// Firebase (modular)
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  setLogLevel
} from 'firebase/firestore';

// --- Configuração do Firebase (fornecida) ---
const firebaseConfig = {
  apiKey: "AIzaSyAe5vcJe5mUUxAX5mXWFjCwL26esbxLvbo",
  authDomain: "projeto-p-c672e.firebaseapp.com",
  databaseURL: "https://projeto-p-c672e-default-rtdb.firebaseio.com",
  projectId: "projeto-p-c672e",
  storageBucket: "projeto-p-c672e.firebasestorage.app",
  messagingSenderId: "474078684255",
  appId: "1:474078684255:web:78313a16cab4e501e0a7ea",
  measurementId: "G-DX6WX55RB8"
};

const appId = 'default-app-id';
const COLLECTION_NAME = 'pedidos_impressao_3d';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header -->
    <div class="bg-white shadow-md">
      <div class="container mx-auto max-w-7xl p-4 md:p-6 flex items-center justify-between space-x-4">
        <div class="flex items-center space-x-4">
            <ion-icon name="cube-outline" class="text-4xl text-indigo-600"></ion-icon>
            <div>
                <h1 class="text-3xl font-bold text-gray-900">Gerenciador de Fila de Impressão 3D</h1>
                <p class="text-gray-600">Dashboard de gerenciamento de pedidos em tempo real.</p>
            </div>
        </div>
        <button *ngIf="authReady() && currentPage() !== 'login'" (click)="handleLogout()" class="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
          <ion-icon name="log-out-outline" class="text-lg"></ion-icon>
          <span>Sair ({{ userRole() }})</span>
        </button>
      </div>
    </div>

    <div class="container mx-auto max-w-7xl p-4 md:p-6">
      <div *ngIf="!authReady()" class="flex flex-col items-center justify-center text-center text-gray-500 py-20">
        <svg class="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-3 text-lg">Autenticando...</p>
      </div>

      <ng-container *ngIf="authReady()">
        <!-- LOGIN -->
        <div *ngIf="currentPage() === 'login'" class="max-w-md mx-auto mt-10 bg-white p-8 rounded-lg shadow-xl">
          <h2 class="text-2xl font-semibold text-center mb-6">Acessar Sistema</h2>
          <form [formGroup]="loginForm" (ngSubmit)="handleLogin()" class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-600">E-mail</label>
              <input type="email" id="email" formControlName="email" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required>
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-gray-600">Senha</label>
              <input type="password" id="password" formControlName="password" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required>
            </div>

            <p *ngIf="loginError()" class="text-sm text-red-600">{{ loginError() }}</p>

            <div class="text-xs text-gray-500 text-center pt-2">
                <p>Use <strong>admin@app.com</strong> / <strong>123456</strong> para login de Admin.</p>
                <p>Use qualquer outro e-mail / senha para login de Usuário (será criado se não existir).</p>
            </div>

            <button type="submit" [disabled]="loginForm.invalid || isLoggingIn()" class="w-full flex items-center justify-center py-3 px-4 border rounded-lg text-white bg-indigo-600">
              <ng-container *ngIf="isLoggingIn(); else notLogging">
                <svg class="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Entrando...</span>
              </ng-container>
              <ng-template #notLogging>
                <ion-icon name="log-in-outline" class="mr-2 text-lg"></ion-icon>
                <span>Entrar</span>
              </ng-template>
            </button>
          </form>
        </div>

        <!-- USER PAGE -->
        <div *ngIf="currentPage() === 'user'" class="max-w-xl mx-auto bg-white p-6 rounded-lg shadow-lg">
          <h2 class="text-2xl font-semibold mb-5">Adicionar Novo Pedido</h2>
          <form [formGroup]="pedidoForm" (ngSubmit)="handleFormSubmit()" class="space-y-4">
            <!-- Solicitante -->
            <div>
              <h3 class="text-lg font-medium text-gray-700 mb-2 border-b pb-1 flex items-center space-x-2">
                  <ion-icon name="person-outline" class="text-indigo-600"></ion-icon>
                  <span>Solicitante</span>
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-600">Nome *</label>
                  <input type="text" formControlName="solicitante" class="mt-1 block w-full px-3 py-2 border rounded-md" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600">Matrícula *</label>
                  <input type="text" formControlName="matricula" class="mt-1 block w-full px-3 py-2 border rounded-md" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600">Área *</label>
                  <select formControlName="area" class="mt-1 block w-full px-3 py-2 border rounded-md" required>
                    <option value="">Selecione...</option>
                    <option value="Envase">Envase</option>
                    <option value="Processos">Processos</option>
                    <option value="Utilidades">Utilidades</option>
                    <option value="SHE">SHE</option>
                    <option value="ADM">ADM</option>
                    <option value="People">People</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600">E-mail *</label>
                  <input type="email" formControlName="email" class="mt-1 block w-full px-3 py-2 border rounded-md" required>
                </div>
              </div>
            </div>

            <!-- Peça -->
            <div>
              <h3 class="text-lg font-medium text-gray-700 mb-2 border-b pb-1 flex items-center space-x-2">
                  <ion-icon name="hardware-chip-outline" class="text-indigo-600"></ion-icon>
                  <span>Detalhes da Peça</span>
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-600">Peça de Interesse *</label>
                  <select formControlName="pecaInteresse" class="mt-1 block w-full px-3 py-2 border rounded-md" required>
                    <option value="">Selecione...</option>
                    <option value="Faca para Etiquetadora">Faca para Etiquetadora</option>
                    <option value="Sapata">Sapata</option>
                    <option value="Tampão">Tampão</option>
                    <option value="Chave para área de Processos">Chave para área de Processos</option>
                    <option value="Hélice">Hélice</option>
                    <option value="Tampa do Lava Olhos">Tampa do Lava Olhos</option>
                    <option value="Tampa do Lava Olhos - Linha de Chopp">Tampa do Lava Olhos - Linha de Chopp</option>
                    <option value="Pino identificador da abertura da válvula on-off">Pino identificador da abertura da válvula on-off</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>
                <div [class.hidden]="pedidoForm.get('pecaInteresse')?.value !== 'Outra'">
                  <label class="block text-sm font-medium text-gray-600">Descreva a peça "Outra" *</label>
                  <input type="text" formControlName="pecaOutraDescricao" class="mt-1 block w-full px-3 py-2 border rounded-md">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600">Código do Fabricante (Original) *</label>
                  <input type="text" formControlName="codigoFabricante" class="mt-1 block w-full px-3 py-2 border rounded-md" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600">Equipamento onde será usada *</label>
                  <input type="text" formControlName="equipamento" class="mt-1 block w-full px-3 py-2 border rounded-md" required>
                </div>
              </div>
            </div>

            <!-- Impressão -->
            <div>
              <h3 class="text-lg font-medium text-gray-700 mb-2 border-b pb-1 flex items-center space-x-2">
                  <ion-icon name="settings-outline" class="text-indigo-600"></ion-icon>
                  <span>Detalhes da Impressão</span>
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-600">Nome do Arquivo (.stl, .3mf) *</label>
                  <input type="text" formControlName="nomeArquivo" class="mt-1 block w-full px-3 py-2 border rounded-md" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600">Prioridade *</label>
                  <select formControlName="prioridade" class="mt-1 block w-full px-3 py-2 border rounded-md" required>
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600">Material *</label>
                  <select formControlName="material" class="mt-1 block w-full px-3 py-2 border rounded-md" required>
                    <option value="">Selecione...</option>
                    <option value="PLA">PLA</option>
                    <option value="ABS">ABS</option>
                    <option value="PETG">PETG</option>
                    <option value="TPU">TPU</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600">Cor *</label>
                  <input type="text" formControlName="cor" class="mt-1 block w-full px-3 py-2 border rounded-md" required>
                </div>
              </div>
            </div>

            <div>
              <button type="submit" [disabled]="pedidoForm.invalid || isSubmitting()" class="w-full flex items-center justify-center py-3 px-4 border rounded-lg text-white bg-indigo-600">
                <ng-container *ngIf="isSubmitting(); else notSubmitting">
                  <svg class="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Enviando...</span>
                </ng-container>
                <ng-template #notSubmitting>
                  <ion-icon name="add-circle-outline" class="mr-2 text-lg"></ion-icon>
                  <span>Adicionar Pedido à Fila</span>
                </ng-template>
              </button>
              <p *ngIf="submitMessage()" class="text-sm text-center mt-3" [class.text-green-600]="submitSuccess()" [class.text-red-600]="!submitSuccess()">{{ submitMessage() }}</p>
            </div>
          </form>
        </div>

        <!-- ADMIN PAGE -->
        <div *ngIf="currentPage() === 'admin'" class="bg-white p-6 rounded-lg shadow-lg">
          <h2 class="text-2xl font-semibold mb-5">Fila de Impressão</h2>

          <div class="flex flex-wrap items-center space-x-2 mb-4">
            <span class="text-sm font-medium text-gray-600">Ordenar por:</span>
            <button (click)="setSortBy('createdAt')" [class.bg-indigo-100]="currentSortBy() === 'createdAt'" class="sort-btn px-3 py-1 rounded-full text-sm font-medium">Data (Padrão)</button>
            <button (click)="setSortBy('prioridade')" [class.bg-indigo-100]="currentSortBy() === 'prioridade'" class="sort-btn px-3 py-1 rounded-full text-sm font-medium">Prioridade</button>
            <button (click)="setSortBy('status')" [class.bg-indigo-100]="currentSortBy() === 'status'" class="sort-btn px-3 py-1 rounded-full text-sm font-medium">Status</button>
          </div>

          <div class="space-y-4">
            <ng-container *ngIf="computedPedidos().length > 0; else emptyState">
              <div *ngFor="let pedido of computedPedidos()" class="bg-white border border-gray-200 rounded-lg shadow-md p-4">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-3">
                  <h3 class="text-xl font-semibold text-gray-800 mb-2 sm:mb-0">{{ pedido.pecaInteresse === 'Outra' ? pedido.pecaOutraDescricao : pedido.pecaInteresse }}</h3>
                  <span class="text-sm font-medium px-3 py-1 rounded-full" [ngClass]="getPriorityClass(pedido.prioridade)">Prioridade: {{ pedido.prioridade }}</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600 mb-4">
                  <div><strong>Solicitante:</strong><p>{{ pedido.solicitante }} ({{ pedido.matricula }})</p></div>
                  <div><strong>Área:</strong><p>{{ pedido.area }}</p></div>
                  <div><strong>Equipamento:</strong><p>{{ pedido.equipamento }}</p></div>
                  <div><strong>Arquivo:</strong><p class="font-mono">{{ pedido.nomeArquivo }}</p></div>
                  <div><strong>Material:</strong><p>{{ pedido.material }} ({{ pedido.cor }})</p></div>
                  <div><strong>Pedido em:</strong><p>{{ pedido.createdAt?.toDate() | date:'dd/MM/yy HH:mm' }}</p></div>
                </div>
                <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <label class="text-sm font-medium text-gray-700">Atualizar Status:</label>
                  <select [id]="'status-' + pedido.id" (change)="updateStatus(pedido.id, $event)" class="status-select w-1/2 p-2 border rounded-md" [ngClass]="getStatusClass(pedido.status)">
                    <option value="Pendente" [selected]="pedido.status === 'Pendente'">Pendente</option>
                    <option value="Em Andamento" [selected]="pedido.status === 'Em Andamento'">Em Andamento</option>
                    <option value="Concluído" [selected]="pedido.status === 'Concluído'">Concluído</option>
                    <option value="Falha" [selected]="pedido.status === 'Falha'">Falha / Cancelado</option>
                  </select>
                </div>
              </div>
            </ng-container>
            <ng-template #emptyState>
              <div class="text-center text-gray-500 py-10">
                <ion-icon name="file-tray-outline" class="text-6xl text-gray-300"></ion-icon>
                <p class="mt-2 text-lg">Nenhum pedido na fila.</p>
                <p class="text-sm">Novos pedidos aparecerão aqui.</p>
              </div>
            </ng-template>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    `:host { font-family: Inter, sans-serif; }`
  ]
})
export class App implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);

  authReady = signal<boolean>(false);
  currentPage = signal<'login' | 'user' | 'admin'>('login');
  userRole = signal<'user' | 'admin' | null>(null);
  userId = signal<string | null>(null);
  loginError = signal<string | null>(null);
  isLoggingIn = signal<boolean>(false);

  pedidos = signal<any[]>([]);
  currentSortBy = signal<'createdAt' | 'prioridade' | 'status'>('createdAt');

  isSubmitting = signal<boolean>(false);
  submitMessage = signal<string | null>(null);
  submitSuccess = signal<boolean>(false);

  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  collectionPath: string;
  unsubscribeFromPedidos: (() => void) | null = null;
  private destroy$ = new Subject<void>();

  loginForm: FormGroup;
  pedidoForm: FormGroup;

  constructor() {
    setLogLevel('Debug');
    this.app = initializeApp(firebaseConfig);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);

    // Removido leading slash para evitar path inválido
    this.collectionPath = `artifacts/${appId}/public/data/${COLLECTION_NAME}`;

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.pedidoForm = this.fb.group({
      solicitante: ['', Validators.required],
      matricula: ['', Validators.required],
      area: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      pecaInteresse: ['', Validators.required],
      pecaOutraDescricao: [''],
      codigoFabricante: ['', Validators.required],
      equipamento: ['', Validators.required],
      nomeArquivo: ['', Validators.required],
      prioridade: ['Média', Validators.required],
      material: ['', Validators.required],
      cor: ['', Validators.required]
    });

    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.userId.set(user.uid);
        if (user.email === 'admin@app.com') {
          this.userRole.set('admin');
          this.currentPage.set('admin');
          this.listenToPedidos();
        } else {
          this.userRole.set('user');
          this.currentPage.set('user');
          if (this.unsubscribeFromPedidos) {
            this.unsubscribeFromPedidos();
            this.unsubscribeFromPedidos = null;
          }
        }
      } else {
        this.userId.set(null);
        this.userRole.set(null);
        this.currentPage.set('login');
        if (this.unsubscribeFromPedidos) {
          this.unsubscribeFromPedidos();
          this.unsubscribeFromPedidos = null;
        }
        this.pedidos.set([]);
      }
      this.authReady.set(true);
      this.isLoggingIn.set(false);
    });
  }

  ngOnInit() {
    this.pedidoForm.get('pecaInteresse')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        const outra = this.pedidoForm.get('pecaOutraDescricao');
        if (value === 'Outra') {
          outra?.setValidators([Validators.required]);
        } else {
          outra?.clearValidators();
        }
        outra?.updateValueAndValidity();
      });
  }

  ngOnDestroy() {
    if (this.unsubscribeFromPedidos) this.unsubscribeFromPedidos();
    this.destroy$.next();
    this.destroy$.complete();
  }

  async handleLogin() {
    if (this.loginForm.invalid) return;
    this.isLoggingIn.set(true);
    this.loginError.set(null);

    const { email, password } = this.loginForm.value;
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        if (email === 'admin@app.com') {
          this.loginError.set('Credenciais de admin inválidas.');
        } else {
          try {
            await createUserWithEmailAndPassword(this.auth, email, password);
          } catch (createError: any) {
            this.loginError.set(this.formatFirebaseError(createError.code));
          }
        }
      } else {
        this.loginError.set(this.formatFirebaseError(error.code));
      }
      this.isLoggingIn.set(false);
    }
  }

  async handleLogout() {
    await signOut(this.auth);
  }

  formatFirebaseError(code: string): string {
    switch (code) {
      case 'auth/wrong-password': return 'Senha incorreta.';
      case 'auth/invalid-email': return 'Formato de e-mail inválido.';
      case 'auth/weak-password': return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/email-already-in-use': return 'Este e-mail já está em uso.';
      default: return 'Erro ao tentar fazer login.';
    }
  }

  async handleFormSubmit() {
    if (this.pedidoForm.invalid) return;
    this.isSubmitting.set(true);
    this.submitMessage.set(null);

    try {
      const formValue = this.pedidoForm.value;
      const novoPedido = {
        ...formValue,
        status: 'Pendente',
        createdAt: serverTimestamp(),
        solicitanteId: this.userId()
      };

      await addDoc(collection(this.db, this.collectionPath), novoPedido);

      this.pedidoForm.reset({ prioridade: 'Média' });
      this.submitSuccess.set(true);
      this.submitMessage.set('Pedido enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar pedido:', error);
      this.submitSuccess.set(false);
      this.submitMessage.set('Erro ao enviar pedido. Tente novamente.');
    } finally {
      this.isSubmitting.set(false);
      setTimeout(() => this.submitMessage.set(null), 3000);
    }
  }

  listenToPedidos() {
    if (this.unsubscribeFromPedidos) {
      this.unsubscribeFromPedidos();
      this.unsubscribeFromPedidos = null;
    }

    if (this.userRole() === 'admin') {
      const q = query(collection(this.db, this.collectionPath));
      this.unsubscribeFromPedidos = onSnapshot(q, (querySnapshot) => {
        const arr: any[] = [];
        querySnapshot.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        this.pedidos.set(arr);
      }, (err) => console.error('Erro ao ouvir a coleção:', err));
    }
  }

  computedPedidos = computed(() => {
    const pedidos = this.pedidos();
    const sortBy = this.currentSortBy();

    const priorityMap: { [k: string]: number } = { 'Alta': 1, 'Média': 2, 'Baixa': 3 };
    const statusMap: { [k: string]: number } = { 'Pendente': 1, 'Em Andamento': 2, 'Concluído': 3, 'Falha': 4 };

    return [...pedidos].sort((a, b) => {
      switch (sortBy) {
        case 'prioridade':
          return (priorityMap[a.prioridade] || 9) - (priorityMap[b.prioridade] || 9);
        case 'status':
          return (statusMap[a.status] || 9) - (statusMap[b.status] || 9);
        case 'createdAt':
        default:
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }
    });
  });

  setSortBy(field: 'createdAt' | 'prioridade' | 'status') {
    this.currentSortBy.set(field);
  }

  async updateStatus(pedidoId: string, event: any) {
    const newStatus = event.target.value;
    try {
      const docRef = doc(this.db, this.collectionPath, pedidoId);
      await updateDoc(docRef, { status: newStatus });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'Alta': return 'bg-red-100 text-red-800';
      case 'Média': return 'bg-yellow-100 text-yellow-800';
      case 'Baixa': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pendente': return 'bg-gray-200 text-gray-700';
      case 'Em Andamento': return 'bg-blue-200 text-blue-700';
      case 'Concluído': return 'bg-green-200 text-green-700';
      case 'Falha': return 'bg-red-200 text-red-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
