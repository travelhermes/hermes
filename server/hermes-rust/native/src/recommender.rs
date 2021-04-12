use neon::prelude::*;

// R_min
const RMIN: i32 = 1;
// R_max
const RMAX: i32 = 5;
// R_med
const RMED: f64 = (RMAX as f64 + RMIN as f64) / 2.0;
// R_med^+
const RMEDP: f64 = (RMAX as f64 + RMED) / 2.0;
// R_med^-
const RMEDM: f64 = (RMED + RMIN as f64) / 2.0;

///
/// Check if two ratings _agree_.
///  
/// ## Arguments
///
/// - `r1` - First rating of the item _p_
/// - `r2` - Second rating of the item _p_
///
/// ## Return
///
/// - boolean
///
fn agreement(r1: i32, r2: i32) -> bool {
    if ((r1 as f64) > RMED && (r2 as f64) < RMED) || ((r1 as f64) < RMED && (r2 as f64) > RMED) {
        return false;
    } else {
        return true;
    }
}

///
/// Compute proximity for two rating values of an item _p_
///
/// ## Arguments
///
/// - `r1` - First rating of the item _p_
/// - `r2` - Second rating of the item _p_
///
/// ## Return
///
/// - Proximity value
///
fn proximity(r1: i32, r2: i32) -> f64 {
    let d: f64 = (r1 - r2).abs() as f64;
    let proximity: f64;
    if agreement(r1, r2) {
        proximity = ((d - ((RMEDP + RMEDM) / 2.0)) / (RMAX - RMIN) as f64).powf(2.0);
    } else {
        let delta;
        if d > RMED {
            delta = 0.75;
        } else if d == RMED {
            delta = 0.5;
        } else {
            delta = 0.25
        }

        proximity = delta * ((1.0 / d) / (RMAX - RMIN) as f64).powf(2.0);
    }

    return proximity;
}

///
/// Compute impact for two rating values of an item _p_
///
/// ## Arguments
///
/// - `r1` - First rating of the item _p_
/// - `r2` - Second rating of the item _p_
///
/// ## Return
///
/// - Impact value
///
fn impact(r1: i32, r2: i32) -> f64 {
    let impact: f64;
    if agreement(r1, r2) {
        impact =
            (-1.0 / (((r1 as f64 - RMED).abs() + 1.0) * ((r2 as f64 - RMED).abs() + 1.0))).exp();
    } else {
        impact = 1.0 / (((r1 as f64 - RMED).abs() + 1.0) * ((r2 as f64 - RMED).abs() + 1.0));
    }

    return impact;
}

///
/// Compute popularity for two rating values of an item _p_
///
/// ## Arguments
///
/// - `r1` - First rating of the item _p_
/// - `r2` - Second rating of the item _p_
/// - `ri` - Average rating of item _p_
///
/// ## Return
///
/// - Popularity value
///
fn popularity(r1: i32, r2: i32, ri: f64) -> f64 {
    let mut popularity: f64 = 0.3010;
    if ((r1 as f64) > ri && (r2 as f64) > ri) || ((r1 as f64) < ri && (r2 as f64) < ri) {
        popularity = (2.0 + ((r1 as f64 + r2 as f64) / 2.0 - ri).powf(2.0)).log10();
    }

    return popularity;
}

///
/// Compute MPIP for two users
///
/// ## Arguments
///
/// - `u1` - Vector of ratings of user 1
/// - `u2` - Vector of ratings of user 2
/// - `avg` - Vector of averages for every item
///
/// ## Return
///
/// - MPIP value between users
/// 
/// ## Notes
/// 
/// Every index in both arrays must correspond to the same item
///
pub fn mpip_users(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let u1_handle: Handle<JsArray> = cx.argument(0)?;
    let u2_handle: Handle<JsArray> = cx.argument(1)?;
    let avg_handle: Handle<JsArray> = cx.argument(2)?;
    let u1: Vec<Handle<JsValue>> = u1_handle.to_vec(&mut cx)?;
    let u2: Vec<Handle<JsValue>> = u2_handle.to_vec(&mut cx)?;
    let avg: Vec<Handle<JsValue>> = avg_handle.to_vec(&mut cx)?;

    if u1.len() != u2.len() || u1.len() != avg.len() {
        panic!("[mpip_users] vectors must be of the same length!");
    }

    let mut sum = 0.0;

    for i in 0..u1.len() {
        let r1 = u1[i].downcast::<JsNumber>().unwrap().value() as i32;
        let r2 = u2[i].downcast::<JsNumber>().unwrap().value() as i32;
        let ri = avg[i].downcast::<JsNumber>().unwrap().value();

        sum += proximity(r1, r2) * impact(r1, r2) * popularity(r1, r2, ri);
    }

    // Return the MPIP Value
    Ok(cx.number(sum))
}

// TODO: Comment
pub fn cf_prediction(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let similarity_handle: Handle<JsArray> = cx.argument(0)?;
    let rating_handle: Handle<JsArray> = cx.argument(1)?;
    let avg_ratings_handle: Handle<JsArray> = cx.argument(2)?;
    // \overline{r_{u_j}}
    let avg_user = cx.argument::<JsNumber>(3)?.value();
    // \overline{r_{I_i}}
    let avg_item = cx.argument::<JsNumber>(4)?.value();

    let similarity: Vec<Handle<JsValue>> = similarity_handle.to_vec(&mut cx)?;
    let rating: Vec<Handle<JsValue>> = rating_handle.to_vec(&mut cx)?; 
    let avg_ratings: Vec<Handle<JsValue>> = avg_ratings_handle.to_vec(&mut cx)?; 

    if similarity.len() != rating.len() || similarity.len() != avg_ratings.len() {
        panic!("[cf_prediction] vectors must be of the same length!");
    }

    let mut sum_similarity = 0.0;
    for i in 0..similarity.len() {
        sum_similarity += similarity[i].downcast::<JsNumber>().unwrap().value();
    }

    let mut sum = 0.0;
    for i in 0..similarity.len() {
        // sim(u_j, u_h)
        let s = similarity[i].downcast::<JsNumber>().unwrap().value();
        // r_{u_h,I_i}
        let r = rating[i].downcast::<JsNumber>().unwrap().value();
        // \overline{r_{u_h}}
        let u = avg_ratings[i].downcast::<JsNumber>().unwrap().value();

        sum += s * (((r - u) + ((avg_user + avg_item) / 2.0 - avg_user)) / 2.0);
    }

    let res = avg_user + sum / sum_similarity;

    // Return value
    Ok(cx.number(res))
}

// TODO: Comment
pub fn cb_prediction(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let percentages_handle: Handle<JsArray> = cx.argument(0)?;
    let percentages: Vec<Handle<JsValue>> = percentages_handle.to_vec(&mut cx)?;

    let mut sum = 0.0;

    for i in 0..percentages.len() {
        sum += percentages[i].downcast::<JsNumber>().unwrap().value();
    }

    // Return the MPIP Value
    Ok(cx.number(sum / percentages.len() as f64))
}