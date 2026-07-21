<?php

namespace App\Http\Controllers;

use App\Models\Faq;
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
        $validator = Validator::make($request->all(), [
            'question' => 'required|string|max:500',
            'answer' => 'required|string',
            'keywords' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return respones()->json(['errors' => $validator->errors()], 422);
        }

        $admin = $request->user()->admin;

        $faq = Faq::create([
            'question' => $request->question,
            'answer' => $request->answer,
            'keywords' => $request->keywords,
            'created_by' => $admin->id,
        ]);

        return response()->json([
            'message' => 'FAQ created successfully.',
            'faq' => $faq,
        ], 201);
    }

    public function update (Request $request, Faq $faq)
    {
        $validator = Validator::make($request->all(), [
            'question' => 'required|string|max:500',
            'answer' => 'required|string',
            'keywords' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $faq->update([
            'question' => $request->question,
            'answer' => $request->answer,
            'keywords' => $request->keywords,
        ]);

        return response()->json([
            'message' => 'FAQ updated successfully',
            'faq' => $faq,
        ]);
    } 

    public function destroy(Faq $faq)
    {
        $faq->delete();
            
        return response()->json([
            'message' => 'FAQ deleted successfully.'
        ]);
    }

}
