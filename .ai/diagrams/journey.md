<user_journey_analysis>
1) Ścieżki użytkownika z wymagań (PRD + Auth Spec):
- Publiczne wejścia: "/" (landing), "/login", "/register"; cała reszta chroniona.
- Rejestracja (US-001): formularz email+hasło, walidacja, sukces → auto‑logowanie → redirect do `\u002Fdashboard`; błędy (email istnieje, walidacja) → komunikaty.
- Logowanie (US-002): email+hasło, Remember me, sukces → redirect do `\u002Fdashboard` lub do ścieżki z `redirect` param; błędy → komunikat.
- Odzyskiwanie hasła (US-003, US-004): żądanie resetu → email z linkiem → ustaw nowe hasło → auto‑logowanie → redirect (w Auth Spec oznaczone jako Post‑MVP).
- Próba wejścia na trasę chronioną: middleware → brak sesji → redirect `\u002Flogin?redirect=...`; po udanym logowaniu → powrót do celu.
- Wejście na "/login" lub "/register" będąc zalogowanym: redirect do `\u002Fdashboard` (middleware lub client‑side check).
- Wylogowanie: akcja w nawigacji → czyszczenie sesji → redirect do `\u002Flogin`.
- Admin (US-054): `\u002Fadmin` wymaga roli admin; brak roli → redirect do `\u002Fdashboard`.

2) Główne podróże i stany:
- Nowy użytkownik: Landing → Rejestracja → (walidacja/konflikty) → Auto‑logowanie → Ustawienie sesji (remember me) → Redirect do celu lub `\u002Fdashboard`.
- Powracający użytkownik: Landing/Protected → Logowanie → (walidacja/niepoprawne dane) → Ustawienie sesji → Redirect.
- Próba dostępu do chronionej strony bez sesji: Middleware → `\u002Flogin?redirect=...` → Logowanie → powrót do strony docelowej.
- Odzyskiwanie hasła (Post‑MVP): Reset request → email → reset → auto‑logowanie → redirect.
- Admin access: Autentykacja OK → sprawdzenie roli → AdminPanel lub Dashboard.

3) Punkty decyzyjne i alternatywne ścieżki:
- Walidacja formularzy (login/register) → błędy inline vs przejście dalej.
- Istniejący email podczas rejestracji → błąd konfliktu.
- Nieprawidłowe dane logowania → błąd autentykacji.
- Remember me: dłuższa vs sesyjna trwałość (strategia sesji).
- Obecność `redirect` → powrót do celu vs domyślny `\u002Fdashboard`.
- Sprawdzenie roli dla `\u002Fadmin` → admin vs brak uprawnień.

4) Opis celu kluczowych stanów:
- StronaGlowna: landing z CTA do logowania/rejestracji; jeśli zalogowany → szybki dostęp.
- FormularzLogowania: wprowadzenie danych; walidacja; wysyłka; obsługa błędów.
- FormularzRejestracji: tworzenie konta; walidacja; konflikt email; auto‑logowanie po sukcesie.
- UstawienieSesji: utrwalenie sesji zgodnie z Remember me; gotowość do użycia aplikacji.
- Dashboard: główna funkcjonalność (karty sesji, akcje, AI, itp.).
- Ochrona tras: wymusza autentykację i/lub uprawnienia admin przed dostępem.
- OdzyskiwanieHasla: (Post‑MVP) przywrócenie dostępu bez tworzenia nowego konta.
</user_journey_analysis>

<mermaid_diagram>

```mermaid
stateDiagram-v2

  [*] --> StronaGlowna

  note right of StronaGlowna
    Landing z przyciskami: "Sign In" i "Get Started"
    Zalogowani mogą przejść od razu do Dashboard
  end note

  StronaGlowna --> Logowanie: Kliknij "Sign In"
  StronaGlowna --> Rejestracja: Kliknij "Get Started"
  StronaGlowna --> Dashboard: Wykryto aktywną sesję

  state "Autentykacja" as Autentykacja {
    state "Logowanie" as Logowanie {
      [*] --> FormularzLogowania

      note right of FormularzLogowania
        Pola: email, hasło, Remember me
        Błędy inline i komunikaty o niepowodzeniu
      end note

      FormularzLogowania --> WalidacjaLogowania: Zatwierdź formularz
      state if_log <<choice>>
      WalidacjaLogowania --> if_log
      if_log --> FormularzLogowania: Błędy formularza
      if_log --> SprawdzenieKredencjali: Dane poprawne

      state if_creds <<choice>>
      SprawdzenieKredencjali --> if_creds
      if_creds --> LoginNieudany: Nieprawidłowy email/hasło
      LoginNieudany --> FormularzLogowania: Pokaż błąd
      if_creds --> Zalogowany: Autentykacja OK

      Zalogowany --> UstawienieSesji: Remember me [tak/nie]
    }

    state "Rejestracja" as Rejestracja {
      [*] --> FormularzRejestracji

      note right of FormularzRejestracji
        Pola: email, hasło
        Wymagania hasła + wskaźnik siły
        Auto‑logowanie po sukcesie
      end note

      FormularzRejestracji --> WalidacjaRejestracji: Zatwierdź formularz
      state if_reg <<choice>>
      WalidacjaRejestracji --> if_reg
      if_reg --> FormularzRejestracji: Błędy formularza
      if_reg --> TworzenieKonta: Dane poprawne

      state if_email <<choice>>
      TworzenieKonta --> if_email
      if_email --> EmailZajety: Email już istnieje
      EmailZajety --> FormularzRejestracji: Pokaż błąd
      if_email --> KontoUtworzone: Konto utworzone

      KontoUtworzone --> AutoLogowanie

      state fork_reg <<fork>>
      state join_reg <<join>>
      AutoLogowanie --> fork_reg
      fork_reg --> ZapisZdarzenia: Zdarzenie user_registered
      fork_reg --> UstawienieSesji: Remember me [tak/nie]
      ZapisZdarzenia --> join_reg
      UstawienieSesji --> join_reg
      join_reg --> ZalogowanyPoRejestracji
    }

    state "Odzyskiwanie hasła (Post‑MVP)" as OdzyskiwanieHasla {
      [*] --> FormularzResetu
      FormularzResetu --> WyslanieLinku: Prześlij email
      WyslanieLinku --> OczekiwanieNaEmail
      OczekiwanieNaEmail --> StronaUstawNoweHaslo: Kliknięcie linku
      StronaUstawNoweHaslo --> ZmianaHasla: Zapisz nowe hasło
      ZmianaHasla --> AutoLogowaniePoReset: Auto‑logowanie
      AutoLogowaniePoReset --> UstawienieSesji

      note right of OdzyskiwanieHasla
        PRD: US‑003/US‑004
        Auth Spec: poza zakresem MVP
      end note
    }
  }

  state "Ochrona tras" as Ochrona {
    [*] --> ProbaWejscia
    ProbaWejscia --> if_auth <<choice>>
    if_auth --> Logowanie: Brak sesji [redirect do /login?redirect=...]
    if_auth --> if_admin <<choice>>: Sesja OK
    if_admin --> AdminPanel: Rola admin
    if_admin --> Dashboard: Brak roli admin
  }

  state "Panel użytkownika" as Panel {
    [*] --> historia
    state historia <<history>>
  }

  state "Dashboard" as Dashboard
  state "Historia" as Historia
  state "Sesje" as Sesje
  state "Admin" as AdminPanel
  state "WidokDocelowy" as WidokDocelowy

  ' Przejścia po udanym logowaniu/rejestracji
  state if_redirect <<choice>>
  UstawienieSesji --> if_redirect
  ZalogowanyPoRejestracji --> if_redirect
  Zalogowany --> if_redirect
  AutoLogowaniePoReset --> if_redirect
  if_redirect --> WidokDocelowy: redirect param istnieje
  if_redirect --> Dashboard: brak redirect

  ' Nawigacja w aplikacji po zalogowaniu
  Dashboard --> Historia: Przejdź do historii
  Dashboard --> Sesje: Przejdź do sesji
  Dashboard --> AdminPanel: Użytkownik z rolą admin

  ' Wylogowanie
  Dashboard --> Wylogowanie: Kliknij "Sign Out"
  Wylogowanie --> Logowanie: Sesja wyczyszczona → redirect /login

  ' Zamykanie ścieżki (opcjonalny koniec)
  Wylogowanie --> [*]
```

</mermaid_diagram>


