import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((error) => {
      snackBar.open('Não foi possível carregar os dados. Tente novamente.', 'Fechar', {
        duration: 4000,
      });
      return throwError(() => error);
    })
  );
};
