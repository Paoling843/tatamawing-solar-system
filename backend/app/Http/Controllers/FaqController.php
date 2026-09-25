<?php

namespace App\Http\Controllers;

use App\Models\Faq;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FaqController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');

        $query = Faq::query();

        if ($search){
            $query->where(function ($q) use ($search) {
                $q->where('question', 'like', '%' . $search . '%')
                    ->orwhere('answer', 'like', '%' . $search . '%')
                    ->orwhere('keywords', 'like', '%' . $search . '%');
            });
        }

    $faqs = $query->latest()->get();

    return response()->json($faqs);

    } 

    public function store(Request $request)
    {
        $this->authorize('create', Faq::class);

        $validator = Validator::make($request->all(), [
            'question' => ['required', 'string', 'min:10', 'max:500'],
            'answer' => ['required', 'string', 'min:10'],
            'keywords' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $admin = $request->user()->admin()->firstOrCreate([
            'user_id' => $request->user()->id,
        ], [
            'department' => 'Operations',
        ]);

        $faq = Faq::create([
            'question' => trim($request->question),
            'answer' => trim($request->answer),
            'keywords' => $request->keywords ? trim($request->keywords) : null,
            'created_by' => $admin->id,
        ]);

        AuditLogger::log(
            'faq_created',
            'Created an FAQ.',
            Faq::class,
            $faq->id,
            'FAQ #' . $faq->id
        );

        return response()->json([
            'message' => 'FAQ created successfully.',
            'faq' => $faq,
        ], 201);
    }

    public function update (Request $request, Faq $faq)
    {
        $this->authorize('update', $faq);

        $validator = Validator::make($request->all(), [
            'question' => ['required', 'string', 'min:10', 'max:500'],
            'answer' => ['required', 'string', 'min:10'],
            'keywords' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $faq->update([
            'question' => trim($request->question),
            'answer' => trim($request->answer),
            'keywords' => $request->keywords ? trim($request->keywords) : null,
        ]);

        AuditLogger::log(
            'faq_updated',
            'Updated an FAQ.',
            Faq::class,
            $faq->id,
            'FAQ #' . $faq->id
        );

        return response()->json([
            'message' => 'FAQ updated successfully',
            'faq' => $faq,
        ]);
    } 

    public function destroy(Faq $faq)
    {
        $this->authorize('delete', $faq);

        $faqId = $faq->id;

        $faq->delete();

        AuditLogger::log(
            'faq_deleted',
            'Deleted an FAQ.',
            Faq::class,
            $faqId,
            'FAQ #' . $faqId
        );
            
        return response()->json([
            'message' => 'FAQ deleted successfully.'
        ]);
    }

}
