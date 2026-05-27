<?php

use App\Models\Draw;
use App\Services\PredictionService;
use Illuminate\Database\Eloquent\Collection;

beforeEach(function () {
    $this->service = new PredictionService();
});

function makeDraws(array $scores, string $category = 'CEC'): Collection
{
    $draws = array_map(function ($score, $i) use ($category) {
        $draw = new Draw();
        $draw->cutoff_score     = $score;
        $draw->invitations_issued = 3000;
        $draw->category         = $category;
        $draw->date             = now()->subDays($i * 14);
        return $draw;
    }, $scores, array_keys($scores));

    return new Collection($draws);
}

describe('PredictionService::predict()', function () {
    it('returns strong for score well above average', function () {
        $draws  = makeDraws([520, 518, 522, 515]);
        $result = (new PredictionService())->predict(530, 'CEC', $draws);

        expect($result['strength'])->toBe('strong');
        expect($result['label'])->toBe('High Chance');
    });

    it('returns moderate for score near cutoff', function () {
        $draws  = makeDraws([520, 518, 522, 515]);
        $result = (new PredictionService())->predict(515, 'CEC', $draws);

        expect($result['strength'])->toBe('moderate');
        expect($result['score_needed'])->toBeInt();
    });

    it('returns weak for score well below cutoff', function () {
        $draws  = makeDraws([520, 518, 522, 515]);
        $result = (new PredictionService())->predict(480, 'CEC', $draws);

        expect($result['strength'])->toBe('weak');
        expect($result['label'])->toBe('Long Wait');
    });

    it('handles empty draws gracefully', function () {
        $result = (new PredictionService())->predict(500, 'CEC', new Collection());
        expect($result['strength'])->toBe('weak');
    });
});
