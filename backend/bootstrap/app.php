<?php

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Runs behind the host's HTTPS proxy (Render), so trust its headers
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserHasRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // When an unauthenticated request hits an api/* route,
        // return clean JSON 401 instead of redirecting to login page
        $exceptions->render(function (AuthenticationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Your session has ended. Please log in again.'], 401);
            }
        });

        // Plain-language messages for the API instead of Laravel's defaults
        // ("No query results for model [App\Models\…]", "This action is
        // unauthorized.", "Server Error"), which would otherwise reach the screen.
        // Validation (422) keeps the field messages written in each request.
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*') || $e instanceof ValidationException || $e instanceof AuthenticationException) {
                return null;
            }

            $json = fn (string $message, int $status) => response()->json(['message' => $message], $status);

            if ($e instanceof ModelNotFoundException || $e instanceof NotFoundHttpException) {
                return $json("We couldn't find that. It may have been removed.", 404);
            }
            if ($e instanceof AuthorizationException || $e instanceof AccessDeniedHttpException) {
                return $json("You don't have permission to do this.", 403);
            }
            if ($e instanceof ThrottleRequestsException) {
                return $json('Too many attempts. Please wait a minute and try again.', 429);
            }
            if ($e instanceof PostTooLargeException) {
                return $json('That file is too large. Upload a file under 10 MB.', 413);
            }
            if ($e instanceof HttpExceptionInterface) {
                return null; // other HTTP errors keep their own status and message
            }

            // Anything unexpected (database errors, bugs). Still written to the
            // log; while debugging locally the full error stays visible.
            if (! config('app.debug')) {
                return $json('Something went wrong on our side. Please try again in a moment.', 500);
            }

            return null;
        });
    })->create();